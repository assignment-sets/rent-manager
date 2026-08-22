import mongoose from "mongoose";
import { RentableUnit } from "../models/rentableUnit.model.js";
import { Tenant } from "../models/tenant.model.js";
import { User } from "../models/user.model.js";
import { hasRole } from "../middleware/auth.middleware.js";

// Helper to build full relational population query
const buildPopulateQuery = (query) => {
  return query
    .populate("plotId", "plotId name subtitle type gridPos")
    .populate("floorId", "level label")
    .populate({
      path: "tenantId",
      select:
        "whatsappPhone aadharNumber permanentAddress occupation occupancyType occupantsCount moveInDate leaseEnd rentStatus rentDueDate isAgreementVerified emergencyContact",
      populate: {
        path: "userId",
        select: "name email phone role",
      },
    });
};

/**
 * Retrieve all rentable units (Admin only)
 */
export const getAllRentableUnits = async () => {
  const units = await buildPopulateQuery(
    RentableUnit.find().sort({ unitCode: 1 }),
  );
  return units;
};

/**
 * Retrieve a rentable unit by MongoDB _id or unitCode (e.g. 'A-01', 'B-101')
 */
export const getRentableUnitByIdentifier = async (
  identifier,
  requestingUser,
) => {
  if (!identifier) {
    const error = new Error("Unit identifier is required.");
    error.statusCode = 400;
    throw error;
  }

  const queryCondition = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { unitCode: identifier.trim().toUpperCase() };

  const unit = await buildPopulateQuery(RentableUnit.findOne(queryCondition));

  if (!unit) {
    const error = new Error(`Rentable unit '${identifier}' was not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Access Control: Admins can view all units. Tenants can only view the unit they occupy.
  if (!hasRole(requestingUser, "ADMIN")) {
    let isOccupant = false;

    // Check if unit.tenantId matches requestingUser's tenant profile
    if (unit.tenantId && unit.tenantId.userId) {
      const tenantUserId =
        unit.tenantId.userId._id ||
        unit.tenantId.userId.id ||
        unit.tenantId.userId;
      if (tenantUserId.toString() === requestingUser.id.toString()) {
        isOccupant = true;
      }
    }

    // Secondary check: verify if user's assignedUnitId matches unit._id
    if (!isOccupant) {
      const user = await User.findById(requestingUser.id);
      if (
        user &&
        user.assignedUnitId &&
        user.assignedUnitId.toString() === unit._id.toString()
      ) {
        isOccupant = true;
      }
    }

    if (!isOccupant) {
      const error = new Error(
        "Access forbidden. You can only view the rentable unit you currently occupy.",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  return unit;
};

/**
 * Retrieve the current rentable unit assigned to/occupied by the caller
 */
export const getTenantCurrentUnit = async (requestingUser) => {
  let targetUnitId = null;

  // 1. Check if user has an active Tenant profile
  const tenant = await Tenant.findOne({ userId: requestingUser.id });
  if (tenant) {
    const unit = await RentableUnit.findOne({ tenantId: tenant._id });
    if (unit) targetUnitId = unit._id;
  }

  // 2. Check if user has an assigned unit from onboarding
  if (!targetUnitId) {
    const user = await User.findById(requestingUser.id);
    if (user && user.assignedUnitId) {
      targetUnitId = user.assignedUnitId;
    }
  }

  if (!targetUnitId) {
    const error = new Error(
      "You are not currently assigned to or occupying any rentable unit.",
    );
    error.statusCode = 404;
    throw error;
  }

  const unit = await buildPopulateQuery(RentableUnit.findById(targetUnitId));
  if (!unit) {
    const error = new Error("Assigned rentable unit not found.");
    error.statusCode = 404;
    throw error;
  }

  return unit;
};

/**
 * Update a rentable unit by _id or unitCode (Admin only)
 */
export const updateRentableUnit = async (
  identifier,
  updateData,
  requestingUser,
) => {
  if (!hasRole(requestingUser, "ADMIN")) {
    const error = new Error("Access forbidden. Admin role required.");
    error.statusCode = 403;
    throw error;
  }

  const queryCondition = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { unitCode: identifier.trim().toUpperCase() };

  const unit = await RentableUnit.findOne(queryCondition);
  if (!unit) {
    const error = new Error(`Rentable unit '${identifier}' was not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Base property updates
  const baseFields = [
    "name",
    "type",
    "rent",
    "status",
    "color",
    "bio",
    "unitCode",
  ];
  baseFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (field === "unitCode") {
        unit.unitCode = updateData.unitCode.trim().toUpperCase();
      } else if (field === "rent") {
        unit.rent = Number(updateData.rent);
      } else {
        unit[field] = updateData[field];
      }
    }
  });

  // Specs subdocument updates
  if (updateData.specs && typeof updateData.specs === "object") {
    unit.specs = {
      ...unit.specs.toObject(),
      ...updateData.specs,
    };
  }

  // Snapshots subdocument updates
  if (updateData.snapshots && typeof updateData.snapshots === "object") {
    unit.snapshots = {
      ...unit.snapshots.toObject(),
      ...updateData.snapshots,
    };
  }

  // Tenant assignment / release
  if (updateData.tenantId !== undefined) {
    if (updateData.tenantId === null || updateData.tenantId === "") {
      unit.tenantId = null;
      unit.status = "vacant";
    } else {
      if (!mongoose.Types.ObjectId.isValid(updateData.tenantId)) {
        const error = new Error("Invalid tenant ID format.");
        error.statusCode = 400;
        throw error;
      }
      const targetTenant = await Tenant.findById(updateData.tenantId);
      if (!targetTenant) {
        const error = new Error("Target tenant profile not found.");
        error.statusCode = 404;
        throw error;
      }
      unit.tenantId = targetTenant._id;
      unit.status = "occupied";
    }
  }

  await unit.save();
  return buildPopulateQuery(RentableUnit.findById(unit._id));
};

/**
 * Assign a tenant to a rentable unit (Admin only)
 * Handles automated transfer if tenant already occupies another unit.
 */
export const assignTenantToUnit = async (
  identifier,
  tenantId,
  requestingUser,
) => {
  if (!hasRole(requestingUser, "ADMIN")) {
    const error = new Error("Access forbidden. Admin role required.");
    error.statusCode = 403;
    throw error;
  }

  if (!identifier) {
    const error = new Error("Unit identifier is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    const error = new Error("A valid tenantId is required.");
    error.statusCode = 400;
    throw error;
  }

  // 1. Find target RentableUnit
  const queryCondition = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { unitCode: identifier.trim().toUpperCase() };

  const targetUnit = await RentableUnit.findOne(queryCondition);
  if (!targetUnit) {
    const error = new Error(`Rentable unit '${identifier}' was not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Find target Tenant
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    const error = new Error("Tenant profile not found.");
    error.statusCode = 404;
    throw error;
  }

  // 3. Occupancy check on target unit
  if (
    targetUnit.tenantId &&
    targetUnit.tenantId.toString() !== tenant._id.toString()
  ) {
    const error = new Error(
      `Rentable unit '${targetUnit.unitCode}' is already occupied by another tenant. Please vacate it first.`,
    );
    error.statusCode = 400;
    throw error;
  }

  let transferredFrom = null;

  // 4. Room Transfer Check: Check if tenant is currently occupying a different unit
  const previousUnit = await RentableUnit.findOne({
    tenantId: tenant._id,
    _id: { $ne: targetUnit._id },
  });

  if (previousUnit) {
    transferredFrom = previousUnit.unitCode;
    previousUnit.tenantId = null;
    previousUnit.status = "vacant";
    await previousUnit.save();
  }

  // 5. Assign target unit
  targetUnit.tenantId = tenant._id;
  targetUnit.status = "occupied";
  await targetUnit.save();

  // 6. Synchronize user's assignedUnit fields
  await User.findByIdAndUpdate(tenant.userId, {
    assignedUnitId: targetUnit._id,
    assignedUnitCode: targetUnit.unitCode,
  });

  const populatedUnit = await buildPopulateQuery(
    RentableUnit.findById(targetUnit._id),
  );

  return {
    unit: populatedUnit,
    transferredFrom,
  };
};

/**
 * Vacate a rentable unit (Admin only)
 * Resets tenantId to null and status to 'vacant', and clears assigned unit on associated user.
 */
export const vacateRentableUnit = async (identifier, requestingUser) => {
  if (!hasRole(requestingUser, "ADMIN")) {
    const error = new Error("Access forbidden. Admin role required.");
    error.statusCode = 403;
    throw error;
  }

  if (!identifier) {
    const error = new Error("Unit identifier is required.");
    error.statusCode = 400;
    throw error;
  }

  const queryCondition = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { unitCode: identifier.trim().toUpperCase() };

  const unit = await RentableUnit.findOne(queryCondition);
  if (!unit) {
    const error = new Error(`Rentable unit '${identifier}' was not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (unit.tenantId) {
    const tenant = await Tenant.findById(unit.tenantId);
    if (tenant && tenant.userId) {
      await User.findByIdAndUpdate(tenant.userId, {
        assignedUnitId: null,
        assignedUnitCode: "",
      });
    }
  }

  unit.tenantId = null;
  unit.status = "vacant";
  await unit.save();

  const populatedUnit = await buildPopulateQuery(
    RentableUnit.findById(unit._id),
  );
  return populatedUnit;
};
