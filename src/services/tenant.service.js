import path from "path";
import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model.js";
import { User } from "../models/user.model.js";
import { RentableUnit } from "../models/rentableUnit.model.js";
import { VacateNotice } from "../models/vacateNotice.model.js";
import { hasRole } from "../middleware/auth.middleware.js";
import {
  uploadBufferToS3,
  deleteObjectsFromS3,
  deleteAllVersionsOfObject,
  deletePrefixAllVersions,
  hydrateDocumentUrls,
  generatePresignedDownloadUrl,
} from "./storage.service.js";
import { vacateRentableUnit } from "./rentableUnit.service.js";

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
 * Helper to format tenant response with hydrated pre-signed document URLs
 */
const formatTenantResponse = async (tenant, assignedUnit = null) => {
  if (!tenant) return null;
  const json =
    typeof tenant.toJSON === "function" ? tenant.toJSON() : { ...tenant };
  const hydratedDocs = await hydrateDocumentUrls(json.documents);

  // If no active unit found but tenant has historical snapshot, attach historical unit
  let effectiveUnit = assignedUnit;
  if (!effectiveUnit && json.lastAssignedUnit?.unitCode) {
    effectiveUnit = {
      id: json.lastAssignedUnit.unitId,
      unitCode: json.lastAssignedUnit.unitCode,
      name: json.lastAssignedUnit.name,
      rent: json.lastAssignedUnit.rent,
      status: "vacated",
      isHistorical: true,
      vacatedAt: json.vacatedAt,
    };
  }

  return {
    ...json,
    documents: hydratedDocs,
    assignedUnit: effectiveUnit,
  };
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

  return await formatTenantResponse(tenant, connectedUnit);
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

  return await Promise.all(
    tenants.map((t) =>
      formatTenantResponse(t, unitMap.get(t._id.toString()) || null),
    ),
  );
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

  return await formatTenantResponse(
    tenant,
    unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  );
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

  return await formatTenantResponse(
    tenant,
    unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  );
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

  return await formatTenantResponse(
    tenant,
    unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  );
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

    return await formatTenantResponse(
      tenant,
      unit
        ? {
            id: unit._id,
            unitCode: unit.unitCode,
            name: unit.name,
            type: unit.type,
            rent: unit.rent,
            status: unit.status,
          }
        : null,
    );
  } catch (dbError) {
    // COMPENSATING ROLLBACK: Delete newly uploaded S3 files to prevent orphaned garbage
    await deleteObjectsFromS3([aadharResult.key, photoResult.key]);
    throw dbError;
  }
};

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

  return await formatTenantResponse(
    tenant,
    unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          type: unit.type,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
  );
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

/**
 * Generate a fresh Pre-Signed GET URL on-demand for a specific tenant document (Admin or Profile Owner)
 *
 * @param {string} tenantId - Tenant document ID
 * @param {string} docType - Document type: 'aadharCard' | 'passportPhoto' | 'agreementPdf'
 * @param {Object} requestingUser - Authenticated user context
 * @param {number} [expiresIn=3600] - Expiration in seconds
 * @returns {Promise<{ docType: string, url: string, key: string, expiresIn: number }>}
 */
export const getPresignedDocumentUrl = async (
  tenantId,
  docType,
  requestingUser,
  expiresIn = 3600,
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

  // Authorization check: User must be ADMIN or the owner of this tenant profile
  const isOwner = tenant.userId.toString() === requestingUser.id;
  const isAdmin = hasRole(requestingUser, "ADMIN");

  if (!isOwner && !isAdmin) {
    const error = new Error("Access forbidden. You cannot access this document.");
    error.statusCode = 403;
    throw error;
  }

  let docKey = tenant.documents?.[docType]?.key;
  if (!docKey && tenant.documents?.[docType]?.url) {
    const url = tenant.documents[docType].url;
    if (url.includes(".amazonaws.com/")) {
      docKey = url.split(".amazonaws.com/")[1]?.split("?")[0];
    }
  }

  if (!docKey) {
    const error = new Error(`No file found for document type "${docType}".`);
    error.statusCode = 404;
    throw error;
  }

  const presignedUrl = await generatePresignedDownloadUrl(docKey, expiresIn);

  return {
    docType,
    url: presignedUrl,
    key: docKey,
    expiresIn,
  };
};

/**
 * Helper to calculate and validate vacate date against predetermined unit notice period
 */
const calculateAndValidateVacateDate = (
  intendedVacateDate,
  noticePeriodMonths = 1,
) => {
  const minVacateDate = new Date();
  minVacateDate.setMonth(minVacateDate.getMonth() + noticePeriodMonths);

  if (!intendedVacateDate) {
    return minVacateDate;
  }

  const suppliedDate = new Date(intendedVacateDate);
  if (isNaN(suppliedDate.getTime())) {
    return minVacateDate;
  }

  // Grace window of 24 hours for timezone differences
  const minAllowedTimestamp = minVacateDate.getTime() - 24 * 60 * 60 * 1000;
  if (suppliedDate.getTime() < minAllowedTimestamp) {
    const minIsoStr = minVacateDate.toISOString().split("T")[0];
    const error = new Error(
      `Intended vacate date violates the predetermined legal notice period of ${noticePeriodMonths} month(s). The earliest allowable move-out date is ${minIsoStr}.`,
    );
    error.statusCode = 400;
    throw error;
  }

  return suppliedDate;
};

/**
 * Tenant submits move-out notice
 */
export const createTenantVacateNotice = async (
  userId,
  { intendedVacateDate, reason },
) => {
  const tenant = await Tenant.findOne({ userId });
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const unit = await RentableUnit.findOne({ tenantId: tenant._id });
  if (!unit) {
    const error = new Error(
      "You do not currently occupy an active rentable unit.",
    );
    error.statusCode = 400;
    throw error;
  }

  const existingNotice = await VacateNotice.findOne({
    tenantId: tenant._id,
    status: { $in: ["PENDING", "NOTICE_SERVED"] },
  });

  if (existingNotice) {
    const error = new Error(
      "An active move-out notice already exists for your unit.",
    );
    error.statusCode = 400;
    throw error;
  }

  const noticePeriodMonths = unit.specs?.noticePeriodMonths || 1;
  const finalVacateDate = calculateAndValidateVacateDate(
    intendedVacateDate,
    noticePeriodMonths,
  );

  const notice = await VacateNotice.create({
    tenantId: tenant._id,
    userId: tenant.userId,
    unitId: unit._id,
    unitCode: unit.unitCode,
    initiatedBy: "TENANT",
    noticePeriodMonths,
    intendedVacateDate: finalVacateDate,
    reason: (reason || "").trim(),
    status: "PENDING",
  });

  return notice;
};

/**
 * Tenant fetches their active move-out notice
 */
export const getMyActiveVacateNotice = async (userId) => {
  const tenant = await Tenant.findOne({ userId });
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const notice = await VacateNotice.findOne({
    tenantId: tenant._id,
    status: { $in: ["PENDING", "NOTICE_SERVED"] },
  }).sort({ createdAt: -1 });

  return notice;
};

/**
 * Admin serves a move-out notice to a tenant
 */
export const serveAdminVacateNotice = async (
  tenantId,
  { intendedVacateDate, reason, adminNotes },
  adminUserId,
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

  const unit = await RentableUnit.findOne({ tenantId: tenant._id });
  if (!unit) {
    const error = new Error(
      "Tenant does not currently occupy an active rentable unit.",
    );
    error.statusCode = 400;
    throw error;
  }

  const noticePeriodMonths = unit.specs?.noticePeriodMonths || 1;
  const finalVacateDate = calculateAndValidateVacateDate(
    intendedVacateDate,
    noticePeriodMonths,
  );

  const notice = await VacateNotice.create({
    tenantId: tenant._id,
    userId: tenant.userId,
    unitId: unit._id,
    unitCode: unit.unitCode,
    initiatedBy: "ADMIN",
    noticePeriodMonths,
    intendedVacateDate: finalVacateDate,
    reason: (reason || "").trim(),
    adminNotes: (adminNotes || "").trim(),
    status: "NOTICE_SERVED",
    resolvedBy: adminUserId,
  });

  return notice;
};

/**
 * Admin lists all move-out notices with optional filters
 */
export const getAllVacateNotices = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.initiatedBy) query.initiatedBy = filters.initiatedBy;
  if (filters.unitCode) query.unitCode = filters.unitCode.trim().toUpperCase();

  const notices = await VacateNotice.find(query)
    .populate({
      path: "tenantId",
      select: "whatsappPhone aadharNumber rentStatus tenancyStatus",
      populate: { path: "userId", select: "name email phone" },
    })
    .populate("userId", "name email phone")
    .populate("unitId", "unitCode name rent status")
    .sort({ createdAt: -1 });

  return notices;
};

/**
 * Admin reviews a tenant-submitted move-out notice
 */
export const reviewVacateNotice = async (
  noticeId,
  { action, adminNotes },
  adminUser,
) => {
  if (!mongoose.Types.ObjectId.isValid(noticeId)) {
    const error = new Error("Invalid notice ID format.");
    error.statusCode = 400;
    throw error;
  }

  const notice = await VacateNotice.findById(noticeId);
  if (!notice) {
    const error = new Error("Vacate notice not found.");
    error.statusCode = 404;
    throw error;
  }

  if (notice.status !== "PENDING") {
    const error = new Error(
      `Cannot review notice with status '${notice.status}'. Only 'PENDING' notices can be reviewed.`,
    );
    error.statusCode = 400;
    throw error;
  }

  if (action === "APPROVE_AND_VACATE") {
    // Atomically execute unit vacate
    const vacateResult = await vacateRentableUnit(
      notice.unitId,
      adminUser,
      notice.reason || "Vacate notice approved by admin",
    );

    notice.status = "COMPLETED";
    if (adminNotes) notice.adminNotes = adminNotes.trim();
    notice.resolvedAt = new Date();
    notice.resolvedBy = adminUser.id || adminUser._id;
    await notice.save();

    return {
      notice,
      vacateResult,
    };
  } else if (action === "REJECT") {
    notice.status = "REJECTED";
    if (adminNotes) notice.adminNotes = adminNotes.trim();
    notice.resolvedAt = new Date();
    notice.resolvedBy = adminUser.id || adminUser._id;
    await notice.save();

    return {
      notice,
    };
  } else {
    const error = new Error(
      "Invalid review action. Allowed: 'APPROVE_AND_VACATE' or 'REJECT'",
    );
    error.statusCode = 400;
    throw error;
  }
};



