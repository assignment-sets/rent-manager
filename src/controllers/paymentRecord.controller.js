import * as paymentRecordService from "../services/paymentRecord.service.js";
import { Tenant } from "../models/tenant.model.js";
import { hasRole } from "../middleware/auth.middleware.js";

/**
 * Record a manual payment (Admin only)
 */
export const handleRecordPayment = async (req, res) => {
  try {
    const result = await paymentRecordService.recordManualPayment(
      req.body,
      req.user.id,
    );

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully and rent status synchronized",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get all payment records with filters (Admin only)
 */
export const handleGetAllPayments = async (req, res) => {
  try {
    const records = await paymentRecordService.getPaymentRecords(req.query);

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get complete rent ledger and arrears breakdown for a tenant (Admin or Profile Owner)
 */
export const handleGetTenantLedger = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant profile not found.",
      });
    }

    const isOwner = tenant.userId.toString() === req.user.id;
    const isAdmin = hasRole(req.user, "ADMIN");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden. You cannot view other tenant ledgers.",
      });
    }

    const ledger = await paymentRecordService.calculateTenantRentLedger(
      req.params.tenantId,
    );

    return res.status(200).json({
      success: true,
      data: ledger,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get logged-in tenant's own rent ledger & dues (Tenant only)
 */
export const handleGetMyLedger = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ userId: req.user.id });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant profile not found for logged in user.",
      });
    }

    const ledger = await paymentRecordService.calculateTenantRentLedger(
      tenant._id,
    );

    return res.status(200).json({
      success: true,
      data: ledger,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Delete / Void a payment record (Admin only)
 */
export const handleDeletePaymentRecord = async (req, res) => {
  try {
    const result = await paymentRecordService.deletePaymentRecord(
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Payment record voided and tenant status re-evaluated",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Direct Quick Override of Tenant Rent Status (Admin only)
 */
export const handleQuickOverrideRentStatus = async (req, res) => {
  try {
    const result = await paymentRecordService.quickOverrideRentStatus(
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Tenant rent status updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
