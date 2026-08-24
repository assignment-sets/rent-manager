import path from "path";
import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model.js";
import { User } from "../models/user.model.js";
import { RentableUnit } from "../models/rentableUnit.model.js";
import { hasRole } from "../middleware/auth.middleware.js";
import {
  uploadBufferToS3,
  deleteObjectsFromS3,
  deleteAllVersionsOfObject,
  deletePrefixAllVersions,
} from "./storage.service.js";

/**
 * Helper to compute ordinal suffix for day of month (e.g. 1st, 2nd, 15th)
 */
const getOrdinalDay = (day) => {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

/**
 * Onboard a new Tenant profile for a registered user (Tenant onboarding)
 * Performs state machine activation: RentableUnit pending -> occupied
 */
export const onboardTenantProfile = async (userId, tenantData) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID format.");
    error.statusCode = 400;
    throw error;
  }

  // Verify the user exists
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // Enforce 1-to-1 relationship between User and Tenant profile
  const existingTenant = await Tenant.findOne({ userId });
  if (existingTenant) {
    const error = new Error("A tenant profile already exists for this user.");
    error.statusCode = 400;
    throw error;
  }

  const {
    aadharNumber,
    permanentAddress,
    occupation,
    occupancyType,
    occupantsCount,
    phone,
    whatsappPhone,
    moveInDate: inputMoveInDate,
    leaseEnd: inputLeaseEnd,
    rentStatus,
    rentDueDate,
    isAgreementVerified,
    emergencyContact,
  } = tenantData;

  // Strict Essential Validations for Onboarding
  const effectivePhone = (phone || user.phone || "").trim();
  if (!effectivePhone) {
    const error = new Error("Phone number is required for tenant onboarding.");
    error.statusCode = 400;
    throw error;
  }

  if (!aadharNumber || !aadharNumber.trim()) {
    const error = new Error("Aadhar number is required for tenant onboarding.");
    error.statusCode = 400;
    throw error;
  }

  if (!permanentAddress || !permanentAddress.trim()) {
    const error = new Error(
      "Permanent address is required for tenant onboarding.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!occupation || !occupation.trim()) {
    const error = new Error("Occupation is required for tenant onboarding.");
    error.statusCode = 400;
    throw error;
  }

  // Update and sync user phone if provided or updated
  if (user.phone !== effectivePhone) {
    user.phone = effectivePhone;
    await user.save();
  }

  // Smart Defaults Calculation
  const moveIn = inputMoveInDate ? new Date(inputMoveInDate) : new Date();

  let leaseEnd = null;
  if (inputLeaseEnd) {
    leaseEnd = new Date(inputLeaseEnd);
  } else {
    leaseEnd = new Date(moveIn);
    leaseEnd.setMonth(leaseEnd.getMonth() + 11); // Standard 11-month tenure
  }

  const defaultRentDueDate = `${getOrdinalDay(moveIn.getDate())} of every month`;

  const tenant = new Tenant({
    userId,
    aadharNumber: aadharNumber.trim(),
    permanentAddress: permanentAddress.trim(),
    occupation: occupation.trim(),
    occupancyType: occupancyType || "Solo / Bachelor",
    occupantsCount: Number(occupantsCount) || 1,
    whatsappPhone: (whatsappPhone || user.phone || "").trim(),
    moveInDate: moveIn,
    leaseEnd,
    rentStatus: rentStatus || "Pending",
    rentDueDate: rentDueDate || defaultRentDueDate,
    isAgreementVerified: isAgreementVerified || false,
    documents: {},
    emergencyContact: emergencyContact
      ? {
          name: (emergencyContact.name || "").trim(),
          relation: (emergencyContact.relation || "").trim(),
          phone: (emergencyContact.phone || "").trim(),
        }
      : { name: "", relation: "", phone: "" },
  });

  await tenant.save();
  await tenant.populate("userId", "name email phone role");

  let connectedUnit = null;

  // STATE MACHINE: Activate reserved unit from 'pending' -> 'occupied'
  if (user.assignedUnitId) {
    const unit = await RentableUnit.findById(user.assignedUnitId);
    if (unit) {
      unit.tenantId = tenant._id;
      unit.status = "occupied";
      await unit.save();
      connectedUnit = {
        id: unit._id,
        unitCode: unit.unitCode,
        name: unit.name,
        type: unit.type,
        rent: unit.rent,
        status: unit.status,
      };
    }
  }

  return {
    ...tenant.toJSON(),
    assignedUnit: connectedUnit,
  };
};

/**
 * Retrieve all tenant profiles (Admin action)
 */
export const getAllTenants = async () => {
  const tenants = await Tenant.find()
    .populate("userId", "name email phone role")
    .sort({ createdAt: -1 });

  const tenantIds = tenants.map((t) => t._id);
  const units = await RentableUnit.find({ tenantId: { $in: tenantIds } });

  const unitMap = new Map();
  units.forEach((u) => {
    unitMap.set(u.tenantId.toString(), {
      id: u._id,
      unitCode: u.unitCode,
      name: u.name,
      type: u.type,
      rent: u.rent,
      status: u.status,
    });
  });

  return tenants.map((t) => ({
    ...t.toJSON(),
    assignedUnit: unitMap.get(t._id.toString()) || null,
  }));
};

/**
 * Retrieve a tenant profile by associated User ID
 */
export const getTenantByUserId = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID format.");
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findOne({ userId }).populate(
    "userId",
    "name email phone role",
  );

  if (!tenant) {
    const error = new Error("Tenant profile not found for this user.");
    error.statusCode = 404;
    throw error;
  }

  const unit = await RentableUnit.findOne({ tenantId: tenant._id });

  return {
    ...tenant.toJSON(),
    assignedUnit: unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  };
};

/**
 * Retrieve a tenant profile by Tenant ID
 */
export const getTenantById = async (tenantId) => {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    const error = new Error("Invalid tenant ID format.");
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findById(tenantId).populate(
    "userId",
    "name email phone role",
  );

  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const unit = await RentableUnit.findOne({ tenantId: tenant._id });

  return {
    ...tenant.toJSON(),
    assignedUnit: unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  };
};

/**
 * Update a tenant profile (Admin or Profile Owner)
 */
export const updateTenant = async (tenantId, updateData, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    const error = new Error("Invalid tenant ID format.");
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  // Authorization check: Only Admin or the owning Tenant can update
  const isOwner = tenant.userId.toString() === requestingUser.id;
  const isAdmin = hasRole(requestingUser, "ADMIN");

  if (!isOwner && !isAdmin) {
    const error = new Error(
      "Access forbidden. You can only update your own tenant profile.",
    );
    error.statusCode = 403;
    throw error;
  }

  const allowedFields = [
    "whatsappPhone",
    "aadharNumber",
    "permanentAddress",
    "occupation",
    "occupancyType",
    "occupantsCount",
    "moveInDate",
    "leaseEnd",
    "rentStatus",
    "rentDueDate",
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === "moveInDate" || field === "leaseEnd") {
        tenant[field] = new Date(updateData[field]);
      } else {
        tenant[field] = updateData[field];
      }
    }
  }

  // Admin-only fields (e.g. agreement verification)
  if (isAdmin && updateData.isAgreementVerified !== undefined) {
    tenant.isAgreementVerified = Boolean(updateData.isAgreementVerified);
  }

  // Emergency contact update
  if (updateData.emergencyContact) {
    const { name, relation, phone } = updateData.emergencyContact;
    if (name) tenant.emergencyContact.name = name.trim();
    if (relation) tenant.emergencyContact.relation = relation.trim();
    if (phone) tenant.emergencyContact.phone = phone.trim();
  }

  await tenant.save();
  await tenant.populate("userId", "name email phone role");

  const unit = await RentableUnit.findOne({ tenantId: tenant._id });

  return {
    ...tenant.toJSON(),
    assignedUnit: unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  };
};

/**
 * Submit Phase 2 Agreement Documents (Tenant Action)
 * Uploads Aadhar Card and Passport Photo to AWS S3 in parallel,
 * updates Tenant documents & emergency contact atomically with compensating S3 rollback on DB error.
 */
export const submitAgreementDocs = async (userId, { files, body }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID format.");
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findOne({ userId });
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const aadharFile = files?.aadharCard?.[0];
  const photoFile = files?.passportPhoto?.[0];

  if (!aadharFile) {
    const error = new Error("Aadhar Card file ('aadharCard') is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!photoFile) {
    const error = new Error("Passport Photo file ('passportPhoto') is required.");
    error.statusCode = 400;
    throw error;
  }

  const timestamp = Date.now();
  const aadharExt = path.extname(aadharFile.originalname) || ".pdf";
  const photoExt = path.extname(photoFile.originalname) || ".jpg";

  const aadharKey = `tenants/${userId}/aadharCard_${timestamp}${aadharExt}`;
  const photoKey = `tenants/${userId}/passportPhoto_${timestamp}${photoExt}`;

  // 1. Parallel Upload to AWS S3
  const [aadharResult, photoResult] = await Promise.all([
    uploadBufferToS3({
      buffer: aadharFile.buffer,
      key: aadharKey,
      contentType: aadharFile.mimetype || "application/pdf",
    }),
    uploadBufferToS3({
      buffer: photoFile.buffer,
      key: photoKey,
      contentType: photoFile.mimetype || "image/jpeg",
    }),
  ]);

  // 2. Atomic Database Update (with compensating S3 rollback on failure)
  try {
    tenant.documents.aadharCard = {
      url: aadharResult.url,
      key: aadharResult.key,
      uploadedAt: new Date(),
    };

    tenant.documents.passportPhoto = {
      url: photoResult.url,
      key: photoResult.key,
      uploadedAt: new Date(),
    };

    if (body.emergencyContactName) {
      tenant.emergencyContact = {
        name: body.emergencyContactName.trim(),
        relation: body.emergencyContactRelation?.trim() || "Guardian",
        phone: body.emergencyContactPhone?.trim() || "",
      };
    }

    if (body.whatsappPhone) {
      tenant.whatsappPhone = body.whatsappPhone.trim();
    }

    if (body.permanentAddress) {
      tenant.permanentAddress = body.permanentAddress.trim();
    }

    // Advance state machine: transition to SUBMITTED and clear any previous rejection
    tenant.agreementStatus = "SUBMITTED";
    tenant.rejectionReason = "";
    tenant.isAgreementVerified = false;

    await tenant.save();
    await tenant.populate("userId", "name email phone role");

    const unit = await RentableUnit.findOne({ tenantId: tenant._id });

    return {
      ...tenant.toJSON(),
      assignedUnit: unit
        ? {
            id: unit._id,
            unitCode: unit.unitCode,
            name: unit.name,
            type: unit.type,
            rent: unit.rent,
            status: unit.status,
          }
        : null,
    };
  } catch (dbError) {
    // COMPENSATING ROLLBACK: Delete newly uploaded S3 files to prevent orphaned garbage
    await deleteObjectsFromS3([aadharResult.key, photoResult.key]);
    throw dbError;
  }
};

/**
 * Update Agreement Verification Status & PDF URL (Admin Action)
 */
/**
 * Update Agreement Verification Status, PDF Upload & Deletion Lifecycle (Admin Action)
 * Supports:
 * - Direct PDF file upload (streams to deterministic S3 key: agreements/{tenantId}/signed_agreement.pdf)
 * - S3 Versioning (multiple uploads automatically create versions under the same URL)
 * - Complete Multi-Version S3 Purge on deletion (deleteAgreementPdf: true)
 * - Full State Machine control (VERIFIED, REJECTED, SUBMITTED, NOT_SUBMITTED, FAILED)
 */
export const updateAgreementStatus = async (
  tenantId,
  {
    agreementStatus,
    isAgreementVerified,
    agreementPdfUrl,
    rejectionReason,
    deleteAgreementPdf,
    clearAgreementPdf,
  } = {},
  file = null,
) => {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    const error = new Error("Invalid tenant ID format.");
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const isDeletingAgreement =
    deleteAgreementPdf === true ||
    deleteAgreementPdf === "true" ||
    clearAgreementPdf === true ||
    clearAgreementPdf === "true";

  // 1. Handle Deletion / Purging of Agreement PDF (Purges ALL S3 versions & delete markers)
  if (isDeletingAgreement) {
    const deterministicKey = `agreements/${tenant._id}/signed_agreement.pdf`;
    await deleteAllVersionsOfObject(deterministicKey);

    if (tenant.documents?.agreementPdf?.key && tenant.documents.agreementPdf.key !== deterministicKey) {
      await deleteAllVersionsOfObject(tenant.documents.agreementPdf.key);
    }

    tenant.documents.agreementPdf = {
      url: "",
      key: "",
      uploadedAt: null,
    };
  }

  // 2. Handle Direct PDF File Upload (Streams to deterministic S3 key)
  if (file) {
    const deterministicKey = `agreements/${tenant._id}/signed_agreement.pdf`;

    const uploadResult = await uploadBufferToS3({
      buffer: file.buffer,
      key: deterministicKey,
      contentType: file.mimetype || "application/pdf",
      cacheControl: "no-cache, no-store, must-revalidate",
    });

    tenant.documents.agreementPdf = {
      url: uploadResult.url,
      key: uploadResult.key,
      uploadedAt: new Date(),
    };
  } else if (agreementPdfUrl && !isDeletingAgreement) {
    tenant.documents.agreementPdf = {
      url: agreementPdfUrl.trim(),
      key: "",
      uploadedAt: new Date(),
    };
  }

  // 3. Resolve Target Agreement Status
  let targetStatus;
  if (agreementStatus) {
    targetStatus = agreementStatus;
  } else if (file) {
    targetStatus = "VERIFIED";
  } else if (isDeletingAgreement) {
    targetStatus = "NOT_SUBMITTED";
  } else if (isAgreementVerified === true) {
    targetStatus = "VERIFIED";
  } else if (isAgreementVerified === false) {
    targetStatus = "NOT_SUBMITTED";
  } else {
    targetStatus = tenant.agreementStatus;
  }

  tenant.agreementStatus = targetStatus;

  // 4. Synchronize State Side-Effects
  if (targetStatus === "VERIFIED") {
    tenant.isAgreementVerified = true;
    tenant.rejectionReason = "";
  } else if (targetStatus === "REJECTED") {
    tenant.isAgreementVerified = false;
    tenant.rejectionReason =
      rejectionReason?.trim() ||
      "Agreement documents rejected by admin. Please resubmit clear copies.";
  } else if (targetStatus === "FAILED") {
    tenant.isAgreementVerified = false;
    tenant.rejectionReason =
      rejectionReason?.trim() ||
      "Document processing failed. Please retry submission.";
  } else {
    tenant.isAgreementVerified = false;
  }

  await tenant.save();
  await tenant.populate("userId", "name email phone role");

  const unit = await RentableUnit.findOne({ tenantId: tenant._id });

  return {
    ...tenant.toJSON(),
    assignedUnit: unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  };
};

/**
 * Delete a tenant profile, vacate any occupied unit, and purge all S3 documents (Admin only)
 */
export const deleteTenantById = async (tenantId) => {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    const error = new Error("Invalid tenant ID format.");
    error.statusCode = 400;
    throw error;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  // 1. Purge all S3 objects and versions associated with this tenant
  if (tenant.userId) {
    await deletePrefixAllVersions(`tenants/${tenant.userId}/`);
  }
  await deletePrefixAllVersions(`agreements/${tenant._id}/`);

  // 2. Automatically release any occupied RentableUnit
  await RentableUnit.updateMany(
    { tenantId: tenant._id },
    { $set: { tenantId: null, status: "vacant" } },
  );

  // 3. Delete tenant database document
  await Tenant.findByIdAndDelete(tenantId);

  return {
    id: tenant._id,
    userId: tenant.userId,
  };
};

