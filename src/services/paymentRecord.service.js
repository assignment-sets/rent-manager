import mongoose from "mongoose";
import { PaymentRecord } from "../models/paymentRecord.model.js";
import { Tenant } from "../models/tenant.model.js";
import { RentableUnit } from "../models/rentableUnit.model.js";
import { hasRole } from "../middleware/auth.middleware.js";

/**
 * Generate an array of "YYYY-MM" strings between two dates inclusive
 */
const generateMonthRange = (startDate, endDate = new Date()) => {
  const start = new Date(startDate || Date.now());
  const end = new Date(endDate);

  const months = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

/**
 * Calculate the complete Rent Ledger and Arrears Breakdown for a Tenant
 */
export const calculateTenantRentLedger = async (tenantId) => {
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
  const monthlyRent = unit ? unit.rent : 0;

  // Retrieve all historical payment records for this tenant
  const paymentHistory = await PaymentRecord.find({ tenantId: tenant._id })
    .sort({ paidAt: -1, createdAt: -1 })
    .populate("recordedBy", "name email");

  // Compile set of all paid calendar months
  const paidMonthsSet = new Set();
  paymentHistory.forEach((record) => {
    if (Array.isArray(record.monthsCovered)) {
      record.monthsCovered.forEach((m) => paidMonthsSet.add(m));
    }
  });

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Generate all expected tenancy months from moveInDate to current month
  const expectedMonths = generateMonthRange(
    tenant.moveInDate || now,
    now,
  );

  const paidMonths = [];
  const overdueMonths = [];

  expectedMonths.forEach((monthStr) => {
    if (paidMonthsSet.has(monthStr)) {
      paidMonths.push(monthStr);
    } else if (monthStr < currentMonthStr) {
      // Past calendar months that were not paid are strictly OVERDUE
      overdueMonths.push(monthStr);
    }
  });

  const isCurrentMonthPaid = paidMonthsSet.has(currentMonthStr);

  // Parse rent due day (default 5th)
  let rentDueDay = 5;
  if (tenant.rentDueDate) {
    const match = tenant.rentDueDate.match(/\d+/);
    if (match) rentDueDay = parseInt(match[0], 10);
  }

  let currentMonthStatus = "Paid";
  if (!isCurrentMonthPaid) {
    currentMonthStatus = now.getDate() > rentDueDay ? "Overdue" : "Pending";
  }

  // Determine overall aggregate rent status
  let overallStatus = "Paid";
  if (overdueMonths.length > 0 || currentMonthStatus === "Overdue") {
    overallStatus = "Overdue";
  } else if (!isCurrentMonthPaid) {
    overallStatus = "Pending";
  }

  const unpaidPastCount = overdueMonths.length;
  const unpaidTotalCount = unpaidPastCount + (isCurrentMonthPaid ? 0 : 1);
  const totalDueAmount = unpaidTotalCount * monthlyRent;

  return {
    tenantId: tenant._id,
    userId: tenant.userId?._id || tenant.userId,
    unit: unit
      ? {
          id: unit._id,
          unitCode: unit.unitCode,
          name: unit.name,
          rent: unit.rent,
          status: unit.status,
        }
      : null,
    monthlyRent,
    moveInDate: tenant.moveInDate,
    rentDueDate: tenant.rentDueDate,
    rentStatus: overallStatus,
    summary: {
      totalMonthsSinceMoveIn: expectedMonths.length,
      paidMonthsCount: paidMonths.length,
      overdueMonthsCount: overdueMonths.length,
      isCurrentMonthPaid,
      totalUnpaidMonths: unpaidTotalCount,
      totalDueAmount,
      overallStatus,
    },
    breakdown: {
      paidMonths,
      overdueMonths,
      currentMonth: {
        month: currentMonthStr,
        isPaid: isCurrentMonthPaid,
        status: currentMonthStatus,
      },
    },
    history: paymentHistory,
  };
};

/**
 * Synchronize the Tenant document's rentStatus in MongoDB with the calculated ledger
 */
export const syncTenantRentStatus = async (tenantId) => {
  const ledger = await calculateTenantRentLedger(tenantId);

  const tenant = await Tenant.findById(tenantId);
  if (tenant && tenant.rentStatus !== ledger.summary.overallStatus) {
    tenant.rentStatus = ledger.summary.overallStatus;
    await tenant.save();
  }

  return ledger;
};

/**
 * Record a Manual Payment & Settle Dues (Admin Action)
 * Supports FIFO auto-allocation or explicit months selection
 */
export const recordManualPayment = async (paymentData, adminUserId) => {
  const {
    tenantId,
    amount,
    monthsCovered,
    paymentMethod = "UPI",
    transactionReference = "",
    notes = "",
    paidAt,
  } = paymentData;

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
    const error = new Error("Tenant does not have an assigned rentable unit.");
    error.statusCode = 400;
    throw error;
  }

  let finalMonthsCovered = monthsCovered;

  // AUTO-FIFO ALLOCATION: If monthsCovered not specified, settle oldest unpaid months first
  if (!finalMonthsCovered || finalMonthsCovered.length === 0) {
    const currentLedger = await calculateTenantRentLedger(tenant._id);

    // Combine overdue months + current unpaid month in chronological FIFO order
    const unpaidFifoQueue = [...currentLedger.breakdown.overdueMonths];
    if (!currentLedger.breakdown.currentMonth.isPaid) {
      unpaidFifoQueue.push(currentLedger.breakdown.currentMonth.month);
    }

    const monthlyRent = unit.rent > 0 ? unit.rent : amount;
    const monthsCoverableCount = Math.floor(amount / monthlyRent);

    if (unpaidFifoQueue.length > 0) {
      finalMonthsCovered = unpaidFifoQueue.slice(
        0,
        Math.max(1, monthsCoverableCount),
      );
    } else {
      // If tenant is fully up to date, allocate to next upcoming month
      const now = new Date();
      now.setMonth(now.getMonth() + 1);
      finalMonthsCovered = [
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      ];
    }
  }

  // Create the Payment Record
  const paymentRecord = await PaymentRecord.create({
    tenantId: tenant._id,
    userId: tenant.userId,
    unitId: unit._id,
    amount,
    monthsCovered: finalMonthsCovered,
    paymentMethod,
    transactionReference: transactionReference.trim(),
    notes: notes.trim(),
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    recordedBy: adminUserId,
  });

  // Synchronize tenant's rentStatus
  const updatedLedger = await syncTenantRentStatus(tenant._id);

  return {
    paymentRecord,
    ledger: updatedLedger,
  };
};

/**
 * Retrieve all payment records with filters (Admin only)
 */
export const getPaymentRecords = async (filters = {}) => {
  const query = {};

  if (filters.tenantId && mongoose.Types.ObjectId.isValid(filters.tenantId)) {
    query.tenantId = filters.tenantId;
  }

  if (filters.unitId && mongoose.Types.ObjectId.isValid(filters.unitId)) {
    query.unitId = filters.unitId;
  }

  if (filters.month) {
    query.monthsCovered = filters.month;
  }

  if (filters.paymentMethod) {
    query.paymentMethod = filters.paymentMethod;
  }

  const records = await PaymentRecord.find(query)
    .sort({ paidAt: -1, createdAt: -1 })
    .populate({
      path: "tenantId",
      populate: { path: "userId", select: "name email phone role" },
    })
    .populate("unitId", "unitCode name rent")
    .populate("recordedBy", "name email");

  return records;
};

/**
 * Delete / Void a Payment Record and Re-evaluate Tenant Status (Admin only)
 */
export const deletePaymentRecord = async (paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    const error = new Error("Invalid payment ID format.");
    error.statusCode = 400;
    throw error;
  }

  const record = await PaymentRecord.findById(paymentId);
  if (!record) {
    const error = new Error("Payment record not found.");
    error.statusCode = 404;
    throw error;
  }

  const tenantId = record.tenantId;
  await PaymentRecord.findByIdAndDelete(paymentId);

  // Recalculate and synchronize tenant rent status after deletion
  const updatedLedger = await syncTenantRentStatus(tenantId);

  return {
    deletedId: paymentId,
    ledger: updatedLedger,
  };
};

/**
 * Direct Quick Override of Tenant Rent Status (Admin Action)
 */
export const quickOverrideRentStatus = async (
  tenantId,
  { rentStatus, rentDueDate },
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

  if (rentStatus) {
    tenant.rentStatus = rentStatus;
  }

  if (rentDueDate) {
    tenant.rentDueDate = rentDueDate.trim();
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
