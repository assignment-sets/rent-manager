import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model.js";
import { User } from "../models/user.model.js";
import { RentableUnit } from "../models/rentableUnit.model.js";
import { hasRole } from "../middleware/auth.middleware.js";

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
    documentsVaultUrl,
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
    documentsVaultUrl: documentsVaultUrl || "",
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
    "documentsVaultUrl",
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
 * Delete a tenant profile and vacate any occupied unit (Admin only)
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

  // Automatically release any occupied RentableUnit
  await RentableUnit.updateMany(
    { tenantId: tenant._id },
    { $set: { tenantId: null, status: "vacant" } },
  );

  await Tenant.findByIdAndDelete(tenantId);

  return {
    id: tenant._id,
    userId: tenant.userId,
  };
};
