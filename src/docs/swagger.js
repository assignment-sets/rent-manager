import swaggerAutogen from "swagger-autogen";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getComponentSchemas } from "./schemas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = {
  openapi: "3.0.0",
  info: {
    title: "Rent Manager Backend API",
    description:
      "Comprehensive interactive REST API documentation with full Request & Response DTO schemas, Zod validation models, and JWT Bearer authentication.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token (without Bearer prefix in Swagger UI)",
      },
    },
    schemas: getComponentSchemas(),
  },
  security: [{ bearerAuth: [] }],
};

const outputFile = path.join(__dirname, "swagger-output.json");
const routes = [path.join(__dirname, "../index.js")];

const runGenerator = async () => {
  // 1. Run Swagger Autogen
  await swaggerAutogen({ openapi: "3.0.0" })(outputFile, routes, doc);

  // 2. Load generated spec and enrich with exact DTO bindings
  const rawData = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  const schemas = getComponentSchemas();

  rawData.components = {
    ...rawData.components,
    securitySchemes: doc.components.securitySchemes,
    schemas: schemas,
  };

  const setRequestBody = (pathObj, schemaRef, mediaType = "application/json") => {
    if (!pathObj) return;
    pathObj.requestBody = {
      required: true,
      content: {
        [mediaType]: {
          schema: {
            $ref: `#/components/schemas/${schemaRef}`,
          },
        },
      },
    };
  };

  const setResponse = (pathObj, statusCode, schemaRef, description = "Success") => {
    if (!pathObj) return;
    if (!pathObj.responses) pathObj.responses = {};
    pathObj.responses[statusCode] = {
      description,
      content: {
        "application/json": {
          schema: {
            $ref: `#/components/schemas/${schemaRef}`,
          },
        },
      },
    };
  };

  const paths = rawData.paths || {};

  const getOp = (basePath, method = "get") => {
    const clean = basePath.replace(/\/$/, "");
    const slash = clean + "/";
    const target = paths[clean] || paths[slash];
    return target ? target[method.toLowerCase()] : null;
  };

  // Standardize error responses across all endpoints
  Object.keys(paths).forEach((p) => {
    Object.keys(paths[p]).forEach((m) => {
      const op = paths[p][m];
      if (op && op.responses) {
        ["400", "401", "403", "404", "500"].forEach((code) => {
          if (op.responses[code]) {
            setResponse(
              op,
              code,
              "ApiErrorResponse",
              op.responses[code].description || "Error",
            );
          }
        });
      }
    });
  });

  // ==================== AUTH MODULE ====================
  const loginOp = getOp("/api/auth/login", "post");
  if (loginOp) {
    loginOp.summary = "Authenticate user with email and password";
    setRequestBody(loginOp, "LoginRequest");
    setResponse(loginOp, "200", "AuthLoginResponse", "Login successful");
  }

  const bootstrapAdminOp = getOp("/api/auth/bootstrap-admin", "post");
  if (bootstrapAdminOp) {
    bootstrapAdminOp.summary = "Bootstrap initial Admin account (One-time setup)";
    setRequestBody(bootstrapAdminOp, "BootstrapAdminRequest");
    setResponse(bootstrapAdminOp, "201", "GenericSuccessResponse");
  }

  const onboardTenantAuthOp = getOp("/api/auth/onboard-tenant", "post");
  if (onboardTenantAuthOp) {
    onboardTenantAuthOp.summary = "Initiate tenant onboarding account (Admin only)";
    setRequestBody(onboardTenantAuthOp, "OnboardTenantAuthRequest");
    setResponse(onboardTenantAuthOp, "201", "UserProfileResponse");
  }

  const getMeOp = getOp("/api/auth/me", "get");
  if (getMeOp) {
    getMeOp.summary = "Get current logged-in user profile";
    setResponse(getMeOp, "200", "UserProfileResponse");
  }

  const patchMeOp = getOp("/api/auth/me", "patch");
  if (patchMeOp) {
    patchMeOp.summary = "Update current user profile (name/phone)";
    setRequestBody(patchMeOp, "UpdateProfileRequest");
    setResponse(patchMeOp, "200", "UserProfileResponse");
  }

  // ==================== USERS MODULE ====================
  const getUsersOp = getOp("/api/users", "get");
  if (getUsersOp) {
    getUsersOp.summary = "List all user accounts (Admin only)";
    setResponse(getUsersOp, "200", "UserListResponse");
  }

  const getUserByIdOp = getOp("/api/users/{id}", "get");
  if (getUserByIdOp) {
    getUserByIdOp.summary = "Get user account by ID (Admin only)";
    setResponse(getUserByIdOp, "200", "UserProfileResponse");
  }

  const patchUserRoleOp = getOp("/api/users/{id}/role", "patch");
  if (patchUserRoleOp) {
    patchUserRoleOp.summary = "Update user role (Admin only)";
    setRequestBody(patchUserRoleOp, "UpdateRoleRequest");
    setResponse(patchUserRoleOp, "200", "UserProfileResponse");
  }

  const assignUnitOp = getOp("/api/users/{id}/assign-unit", "patch");
  if (assignUnitOp) {
    assignUnitOp.summary = "Assign rentable unit to tenant (Admin only)";
    setRequestBody(assignUnitOp, "AssignUnitRequest");
    setResponse(assignUnitOp, "200", "UserProfileResponse");
  }

  const vacateUnitOp = getOp("/api/users/{id}/vacate-unit", "patch");
  if (vacateUnitOp) {
    vacateUnitOp.summary = "Vacate rentable unit from tenant (Admin only)";
    setResponse(vacateUnitOp, "200", "UserProfileResponse");
  }

  // ==================== TENANTS MODULE ====================
  const tenantOnboardOp = getOp("/api/tenants/onboard", "post");
  if (tenantOnboardOp) {
    tenantOnboardOp.summary = "Phase 1: Tenant self-onboarding form submission";
    setRequestBody(tenantOnboardOp, "TenantOnboardRequest");
    setResponse(tenantOnboardOp, "201", "TenantProfileResponse");
  }

  const getMyTenantProfileOp = getOp("/api/tenants/me", "get");
  if (getMyTenantProfileOp) {
    getMyTenantProfileOp.summary = "Get logged-in tenant's own profile and documents";
    setResponse(getMyTenantProfileOp, "200", "TenantProfileResponse");
  }

  const patchMyTenantProfileOp = getOp("/api/tenants/me", "patch");
  if (patchMyTenantProfileOp) {
    patchMyTenantProfileOp.summary = "Update logged-in tenant's own profile";
    setResponse(patchMyTenantProfileOp, "200", "TenantProfileResponse");
  }

  const submitAgreementDocsOp = getOp("/api/tenants/submit-agreement-docs", "post");
  if (submitAgreementDocsOp) {
    submitAgreementDocsOp.summary =
      "Phase 2: Submit Aadhar & Photo (Multipart file upload)";
    submitAgreementDocsOp.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["aadharCard", "passportPhoto"],
            properties: {
              aadharCard: { type: "string", format: "binary", description: "Aadhar PDF or image" },
              passportPhoto: { type: "string", format: "binary", description: "Passport Photo (PNG/JPG)" },
              whatsappPhone: { type: "string", example: "9674752566" },
              permanentAddress: { type: "string", example: "Flat 4B, Salt Lake, Kolkata" },
              emergencyContactName: { type: "string", example: "Gourab Mondal" },
              emergencyContactRelation: { type: "string", example: "Guardian" },
              emergencyContactPhone: { type: "string", example: "9876543210" },
            },
          },
        },
      },
    };
    setResponse(submitAgreementDocsOp, "200", "TenantProfileResponse");
  }

  const getAllTenantsOp = getOp("/api/tenants", "get");
  if (getAllTenantsOp) {
    getAllTenantsOp.summary = "Get all tenant profiles with unit associations (Admin only)";
    setResponse(getAllTenantsOp, "200", "TenantListResponse");
  }

  const getTenantByIdOp = getOp("/api/tenants/{id}", "get");
  if (getTenantByIdOp) {
    getTenantByIdOp.summary = "Get specific tenant profile by ID (Admin or owner)";
    setResponse(getTenantByIdOp, "200", "TenantProfileResponse");
  }

  const patchAgreementStatusOp = getOp("/api/tenants/{id}/agreement-status", "patch");
  if (patchAgreementStatusOp) {
    patchAgreementStatusOp.summary =
      "Update agreement status, upload PDF, or delete agreement (Admin only)";
    patchAgreementStatusOp.requestBody = {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              agreementPdf: { type: "string", format: "binary", description: "Signed PDF file" },
              agreementStatus: {
                type: "string",
                enum: ["NOT_SUBMITTED", "SUBMITTED", "VERIFIED", "REJECTED", "FAILED"],
              },
              rejectionReason: { type: "string" },
              deleteAgreementPdf: { type: "boolean" },
            },
          },
        },
        "application/json": {
          schema: {
            $ref: "#/components/schemas/UpdateAgreementStatusRequest",
          },
        },
      },
    };
    setResponse(patchAgreementStatusOp, "200", "TenantProfileResponse");
  }

  const patchRentStatusOp = getOp("/api/tenants/{id}/rent-status", "patch");
  if (patchRentStatusOp) {
    patchRentStatusOp.summary =
      "Quick override tenant rent status (Paid/Pending/Overdue) (Admin only)";
    setRequestBody(patchRentStatusOp, "UpdateRentStatusRequest");
    setResponse(patchRentStatusOp, "200", "TenantProfileResponse");
  }

  const getPresignedUrlOp = getOp("/api/tenants/{id}/documents/presigned-url", "get");
  if (getPresignedUrlOp) {
    getPresignedUrlOp.summary =
      "Generate fresh on-demand Pre-Signed GET URL for a private S3 document";
    setResponse(getPresignedUrlOp, "200", "PresignedUrlResponse");
  }

  // ==================== DASHBOARD MODULE ====================
  const getDashboardOp = getOp("/api/dashboard", "get");
  if (getDashboardOp) {
    getDashboardOp.summary =
      "Get aggregated property tree with floors, units, tenant IDs, and pre-signed document URLs";
    setResponse(getDashboardOp, "200", "DashboardTreeResponse");
  }

  // ==================== PAYMENTS MODULE ====================
  const recordPaymentOp = getOp("/api/payments/record", "post");
  if (recordPaymentOp) {
    recordPaymentOp.summary =
      "Record offline payment for single or multi-month lump sum with FIFO settlement (Admin only)";
    setRequestBody(recordPaymentOp, "RecordPaymentRequest");
    setResponse(recordPaymentOp, "201", "PaymentRecordResponse");
  }

  const getAllPaymentsOp = getOp("/api/payments", "get");
  if (getAllPaymentsOp) {
    getAllPaymentsOp.summary =
      "Filterable payment ledger across properties (by tenant, unit, month, method) (Admin only)";
    setResponse(getAllPaymentsOp, "200", "PaymentRecordListResponse");
  }

  const getMyLedgerOp = getOp("/api/payments/my-ledger", "get");
  if (getMyLedgerOp) {
    getMyLedgerOp.summary =
      "Get logged-in tenant's rent breakdown, paid months, overdue arrears, and receipts";
    setResponse(getMyLedgerOp, "200", "PaymentLedgerResponse");
  }

  const getTenantLedgerOp = getOp("/api/payments/tenant/{tenantId}/ledger", "get");
  if (getTenantLedgerOp) {
    getTenantLedgerOp.summary =
      "Get detailed rent ledger and arrears breakdown for a tenant (Admin or owner)";
    setResponse(getTenantLedgerOp, "200", "PaymentLedgerResponse");
  }

  const deletePaymentOp = getOp("/api/payments/{id}", "delete");
  if (deletePaymentOp) {
    deletePaymentOp.summary =
      "Void/delete a payment record and re-evaluate tenant rent status (Admin only)";
    setResponse(deletePaymentOp, "200", "GenericSuccessResponse");
  }

  // ==================== PAYMENT METHODS MODULE ====================
  const createPaymentMethodOp = getOp("/api/payment-methods", "post");
  if (createPaymentMethodOp) {
    createPaymentMethodOp.summary = "Create UPI / Bank Transfer payment destination (Admin only)";
    setRequestBody(createPaymentMethodOp, "CreatePaymentMethodRequest");
    setResponse(createPaymentMethodOp, "201", "GenericSuccessResponse");
  }

  const patchPaymentMethodOp = getOp("/api/payment-methods/{id}", "patch");
  if (patchPaymentMethodOp) {
    patchPaymentMethodOp.summary = "Update payment method (Admin only)";
    setRequestBody(patchPaymentMethodOp, "UpdatePaymentMethodRequest");
    setResponse(patchPaymentMethodOp, "200", "GenericSuccessResponse");
  }

  // ==================== RENTABLE UNITS MODULE ====================
  const getRentableUnitsOp = getOp("/api/rentable-units", "get");
  if (getRentableUnitsOp) {
    getRentableUnitsOp.summary = "List all rentable units (Public / Filterable)";
    setResponse(getRentableUnitsOp, "200", "RentableUnitListResponse");
  }

  // Write enriched specification back to file
  fs.writeFileSync(outputFile, JSON.stringify(rawData, null, 2), "utf-8");
  console.log("Swagger OpenAPI 3.0 specification with complete DTO schemas generated successfully! ✔");
};

runGenerator();
