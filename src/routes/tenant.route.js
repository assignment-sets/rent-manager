import { Router } from "express";
import {
  handleOnboardTenant,
  handleGetAllTenants,
  handleGetMyTenantProfile,
  handleUpdateMyTenantProfile,
  handleGetTenantById,
  handleUpdateTenant,
  handleDeleteTenant,
  handleSubmitAgreementDocs,
  handleUpdateAgreementStatus,
  handleGetPresignedDocumentUrl,
} from "../controllers/tenant.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  uploadAgreementDocsMiddleware,
  uploadAgreementPdfMiddleware,
} from "../middleware/upload.middleware.js";
import {
  tenantOnboardSchema,
  submitAgreementDocsSchema,
  updateAgreementStatusSchema,
} from "../schemas/tenant.schema.js";
import { updateTenantRentStatusSchema } from "../schemas/paymentRecord.schema.js";
import { handleQuickOverrideRentStatus } from "../controllers/paymentRecord.controller.js";

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

// Phase 2: Agreement Document Submission (Atomic multipart upload to S3 + DB update)
router.post(
  "/submit-agreement-docs",
  uploadAgreementDocsMiddleware,
  validate(submitAgreementDocsSchema),
  handleSubmitAgreementDocs,
);

// Admin-only operations
router.get("/", requireAdmin, handleGetAllTenants);
router.delete("/:id", requireAdmin, handleDeleteTenant);

// Admin Agreement Status Update (Supports direct PDF file upload, URL attachment, or status update)
router.patch(
  "/:id/agreement-status",
  requireAdmin,
  uploadAgreementPdfMiddleware,
  validate(updateAgreementStatusSchema),
  handleUpdateAgreementStatus,
);

// Admin Quick Rent Status Override
router.patch(
  "/:id/rent-status",
  requireAdmin,
  validate(updateTenantRentStatusSchema),
  handleQuickOverrideRentStatus,
);

// On-Demand Pre-Signed Download URL (Admin or profile owner)
router.get("/:id/documents/presigned-url", handleGetPresignedDocumentUrl);

// Specific Tenant details (Admin or profile owner)
router.get("/:id", handleGetTenantById);
router.patch("/:id", handleUpdateTenant);

export default router;

