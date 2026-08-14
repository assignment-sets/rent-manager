import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model.js";
import { User } from "../models/user.model.js";
import { RentableUnit } from "../models/rentableUnit.model.js";
import { hasRole } from "../middleware/auth.middleware.js";

/**
 * Create a new Tenant profile for a registered user (Tenant onboarding)
 */
export const createTenantProfile = async (userId, tenantData) => {
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
    whatsappPhone,
    aadharNumber,
    permanentAddress,
    occupation,
    occupancyType,
    occupantsCount,
    moveInDate,
    leaseEnd,
    rentStatus,
    rentDueDate,
    isAgreementVerified,
    documentsVaultUrl,
    emergencyContact,
  } = tenantData;

  if (!permanentAddress) {
    const error = new Error("Permanent address is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!moveInDate || !leaseEnd) {
    const error = new Error("Move-in date and lease end date are required.");
    error.statusCode = 400;
    throw error;
  }

  if (
    !emergencyContact ||
    !emergencyContact.name ||
    !emergencyContact.relation ||
    !emergencyContact.phone
  ) {
    const error = new Error(
      "Emergency contact details (name, relation, phone) are required.",
    );
    error.statusCode = 400;
    throw error;
  }

  const tenant = new Tenant({
    userId,
    whatsappPhone: whatsappPhone || "",
    aadharNumber: aadharNumber || "",
    permanentAddress,
    occupation: occupation || "",
    occupancyType: occupancyType || "Solo / Bachelor",
    occupantsCount: occupantsCount || 1,
    moveInDate: new Date(moveInDate),
    leaseEnd: new Date(leaseEnd),
    rentStatus: rentStatus || "Pending",
    rentDueDate: rentDueDate || "5th of every month",
    isAgreementVerified: isAgreementVerified || false,
    documentsVaultUrl: documentsVaultUrl || "",
    emergencyContact: {
      name: emergencyContact.name.trim(),
      relation: emergencyContact.relation.trim(),
      phone: emergencyContact.phone.trim(),
    },
  });

  await tenant.save();
  return tenant.populate("userId", "name email phone role");
};

/**
 * Retrieve all tenant profiles (Admin action)
 */
export const getAllTenants = async () => {
  const tenants = await Tenant.find()
    .populate("userId", "name email phone role")
    .sort({ createdAt: -1 });

  return tenants;
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

  return tenant;
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

  return tenant;
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
  return tenant.populate("userId", "name email phone role");
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
