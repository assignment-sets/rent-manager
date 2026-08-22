import { Router } from "express";
import {
  handleGetActivePaymentMethods,
  handleGetAllPaymentMethodsAdmin,
  handleGetPaymentMethodById,
  handleCreatePaymentMethod,
  handleUpdatePaymentMethod,
  handleDeletePaymentMethod,
  handleTogglePaymentMethodActive,
  handleSetPrimaryPaymentMethod,
} from "../controllers/paymentMethod.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from "../schemas/paymentMethod.schema.js";

const router = Router();

// All payment method endpoints require a valid JWT token
router.use(authenticateToken);

// --- Public Authenticated Routes (Tenants & Admins) ---

// Get all active payment methods (ordered by isPrimary & displayOrder)
router.get("/", handleGetActivePaymentMethods);

// Get specific payment method by ID
router.get("/:id", handleGetPaymentMethodById);

// --- Admin Only Management Routes ---

// List all payment methods including inactive ones
router.get("/admin/all", requireAdmin, handleGetAllPaymentMethodsAdmin);

// Create a new payment method
router.post(
  "/",
  requireAdmin,
  validate(createPaymentMethodSchema),
  handleCreatePaymentMethod,
);

// Update an existing payment method
router.patch(
  "/:id",
  requireAdmin,
  validate(updatePaymentMethodSchema),
  handleUpdatePaymentMethod,
);

// Delete a payment method
router.delete("/:id", requireAdmin, handleDeletePaymentMethod);

// Toggle active status
router.patch(
  "/:id/toggle-active",
  requireAdmin,
  handleTogglePaymentMethodActive,
);

// Set payment method as primary
router.patch("/:id/set-primary", requireAdmin, handleSetPrimaryPaymentMethod);

export default router;
