import { Router } from "express";
import {
  handleRecordPayment,
  handleGetAllPayments,
  handleGetTenantLedger,
  handleGetMyLedger,
  handleDeletePaymentRecord,
} from "../controllers/paymentRecord.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { recordPaymentSchema } from "../schemas/paymentRecord.schema.js";

const router = Router();

// All payment ledger routes require authentication
router.use(authenticateToken);

// Record a manual offline payment (Admin only)
router.post(
  "/record",
  requireAdmin,
  validate(recordPaymentSchema),
  handleRecordPayment,
);

// Get all payment records across properties (Admin only)
router.get("/", requireAdmin, handleGetAllPayments);

// Get logged-in tenant's own rent ledger (Tenant)
router.get("/my-ledger", handleGetMyLedger);

// Get complete rent ledger for a specific tenant (Admin or profile owner)
router.get("/tenant/:tenantId/ledger", handleGetTenantLedger);

// Void / Delete a payment record (Admin only)
router.delete("/:id", requireAdmin, handleDeletePaymentRecord);

export default router;
