import { Router } from "express";
import {
  handleOnboardTenant,
  handleGetAllTenants,
  handleGetMyTenantProfile,
  handleUpdateMyTenantProfile,
  handleGetTenantById,
  handleUpdateTenant,
  handleDeleteTenant,
} from "../controllers/tenant.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { tenantOnboardSchema } from "../schemas/tenant.schema.js";

const router = Router();

// All tenant routes require a valid JWT token
router.use(authenticateToken);

// Tenant self-onboarding (Executes state machine: unit pending -> occupied)
router.post(
  "/onboard",
  validate(tenantOnboardSchema),
  handleOnboardTenant,
);

router.get("/me", handleGetMyTenantProfile);
router.patch("/me", handleUpdateMyTenantProfile);

// Admin-only operations
router.get("/", requireAdmin, handleGetAllTenants);
router.delete("/:id", requireAdmin, handleDeleteTenant);

// Specific Tenant details (Admin or profile owner)
router.get("/:id", handleGetTenantById);
router.patch("/:id", handleUpdateTenant);

export default router;
