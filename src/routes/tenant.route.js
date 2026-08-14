import { Router } from "express";
import {
  handleCreateTenant,
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
  requireAnyRole,
} from "../middleware/auth.middleware.js";

const router = Router();

// All tenant routes require a valid JWT token
router.use(authenticateToken);

// Tenant self-onboarding & profile management
router.post("/", requireAnyRole, handleCreateTenant);
router.get("/me", requireAnyRole, handleGetMyTenantProfile);
router.patch("/me", requireAnyRole, handleUpdateMyTenantProfile);

// Admin-only operations
router.get("/", requireAdmin, handleGetAllTenants);
router.delete("/:id", requireAdmin, handleDeleteTenant);

// Specific Tenant details (Admin or profile owner)
router.get("/:id", handleGetTenantById);
router.patch("/:id", handleUpdateTenant);

export default router;
