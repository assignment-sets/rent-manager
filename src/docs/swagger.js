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
      "Comprehensive interactive REST API documentation with full Request & Response DTO schemas, Zod validation models, module clustering, and JWT Bearer authentication.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication, identity sessions, and initial admin bootstrap",
    },
    {
      name: "User Management",
      description: "Admin user account querying, role updates, and unit associations",
    },
    {
      name: "Tenant Operations",
      description: "Tenant onboarding lifecycle, KYC document submissions, agreement verification, and S3 pre-signed downloads",
    },
    {
      name: "Rentable Units",
      description: "Room/flat catalog, unit specifications, tenant assignment, and vacating workflows",
    },
    {
      name: "Property Dashboard",
      description: "Interactive property layout tree, floor/unit hierarchies, and aggregated occupancy summaries",
    },
    {
      name: "Payment Management",
      description: "Offline payment recording, FIFO arrears allocation, tenant rent ledger, and receipt voiding",
    },
    {
      name: "Payment Destinations",
      description: "UPI IDs, bank transfer destinations, and cash collection management",
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

  rawData.tags = doc.tags;
  rawData.components = {
    ...rawData.components,
    securitySchemes: doc.components.securitySchemes,
    schemas: schemas,
  };

  const paths = rawData.paths || {};

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

  // =========================================================================
  // 1. AUTHENTICATION MODULE
  // =========================================================================
  const loginOp = getOp("/api/auth/login", "post");
  if (loginOp) {
    loginOp.tags = ["Authentication"];
    loginOp.summary = "Authenticate user with email and password";
    loginOp.description = "Validates user credentials and returns a signed JWT Bearer token.";
    setRequestBody(loginOp, "LoginRequest");
    setResponse(loginOp, "200", "AuthLoginResponse", "Login successful");
  }

  const bootstrapAdminOp = getOp("/api/auth/bootstrap-admin", "post");
  if (bootstrapAdminOp) {
    bootstrapAdminOp.tags = ["Authentication"];
    bootstrapAdminOp.summary = "Bootstrap initial Admin account (One-time setup)";
    bootstrapAdminOp.description = "Creates the primary ADMIN user account if no admin currently exists.";
    setRequestBody(bootstrapAdminOp, "BootstrapAdminRequest");
    setResponse(bootstrapAdminOp, "201", "GenericSuccessResponse");
  }

  const onboardTenantAuthOp = getOp("/api/auth/onboard-tenant", "post");
  if (onboardTenantAuthOp) {
    onboardTenantAuthOp.tags = ["Authentication"];
    onboardTenantAuthOp.summary = "Initiate tenant onboarding account (Admin only)";
    onboardTenantAuthOp.description = "Admin pre-registers a tenant account and links their assigned unit code.";
    setRequestBody(onboardTenantAuthOp, "OnboardTenantAuthRequest");
    setResponse(onboardTenantAuthOp, "201", "UserProfileResponse");
  }

  const getMeOp = getOp("/api/auth/me", "get");
  if (getMeOp) {
    getMeOp.tags = ["Authentication"];
    getMeOp.summary = "Get current logged-in user profile";
    getMeOp.description = "Fetches the authenticated user's account details and assigned unit.";
    setResponse(getMeOp, "200", "UserProfileResponse");
  }

  const patchMeOp = getOp("/api/auth/me", "patch");
  if (patchMeOp) {
    patchMeOp.tags = ["Authentication"];
    patchMeOp.summary = "Update current user profile (name/phone)";
    patchMeOp.description = "Allows the logged-in user to update their name or phone number.";
    setRequestBody(patchMeOp, "UpdateProfileRequest");
    setResponse(patchMeOp, "200", "UserProfileResponse");
  }

  // =========================================================================
  // 2. USER MANAGEMENT MODULE
  // =========================================================================
  const getUsersOp = getOp("/api/users", "get");
  if (getUsersOp) {
    getUsersOp.tags = ["User Management"];
    getUsersOp.summary = "List all user accounts (Admin only)";
    getUsersOp.description = "Retrieves all registered user accounts with roles and unit associations.";
    setResponse(getUsersOp, "200", "UserListResponse");
  }

  const findUserOp = getOp("/api/users/find", "get");
  if (findUserOp) {
    findUserOp.tags = ["User Management"];
    findUserOp.summary = "Search user accounts by query parameters (Admin only)";
    findUserOp.description = "Searches users by email or phone query parameters.";
    setResponse(findUserOp, "200", "UserProfileResponse");
  }

  const getUserByIdOp = getOp("/api/users/{id}", "get");
  if (getUserByIdOp) {
    getUserByIdOp.tags = ["User Management"];
    getUserByIdOp.summary = "Get user account by ID (Admin only)";
    getUserByIdOp.description = "Fetches a specific user record by its 24-character ObjectId.";
    setResponse(getUserByIdOp, "200", "UserProfileResponse");
  }

  const patchUserOp = getOp("/api/users/{id}", "patch");
  if (patchUserOp) {
    patchUserOp.tags = ["User Management"];
    patchUserOp.summary = "Update user account profile details (Admin only)";
    patchUserOp.description = "Admin update of user account fields (name, phone, role).";
    setRequestBody(patchUserOp, "UpdateProfileRequest");
    setResponse(patchUserOp, "200", "UserProfileResponse");
  }

  const deleteUserOp = getOp("/api/users/{id}", "delete");
  if (deleteUserOp) {
    deleteUserOp.tags = ["User Management"];
    deleteUserOp.summary = "Delete user account (Admin only)";
    deleteUserOp.description = "Permanently removes a user account from the system.";
    setResponse(deleteUserOp, "200", "GenericSuccessResponse");
  }

  const patchUserRoleOp = getOp("/api/users/{id}/role", "patch");
  if (patchUserRoleOp) {
    patchUserRoleOp.tags = ["User Management"];
    patchUserRoleOp.summary = "Update user role (Admin only)";
    patchUserRoleOp.description = "Changes the user role to ADMIN, TENANT, or SUPERADMIN.";
    setRequestBody(patchUserRoleOp, "UpdateRoleRequest");
    setResponse(patchUserRoleOp, "200", "UserProfileResponse");
  }

  const assignUnitOp = getOp("/api/users/{id}/assign-unit", "patch");
  if (assignUnitOp) {
    assignUnitOp.tags = ["User Management"];
    assignUnitOp.summary = "Assign rentable unit to tenant (Admin only)";
    assignUnitOp.description = "Associates a unit to the user and marks unit status as occupied.";
    setRequestBody(assignUnitOp, "AssignUnitRequest");
    setResponse(assignUnitOp, "200", "UserProfileResponse");
  }

  const vacateUnitOp = getOp("/api/users/{id}/vacate-unit", "patch");
  if (vacateUnitOp) {
    vacateUnitOp.tags = ["User Management"];
    vacateUnitOp.summary = "Vacate rentable unit from tenant (Admin only)";
    vacateUnitOp.description = "Dissociates the assigned unit and resets unit status to vacant.";
    setResponse(vacateUnitOp, "200", "UserProfileResponse");
  }

  // =========================================================================
  // 3. TENANT OPERATIONS MODULE
  // =========================================================================
  const tenantOnboardOp = getOp("/api/tenants/onboard", "post");
  if (tenantOnboardOp) {
    tenantOnboardOp.tags = ["Tenant Operations"];
    tenantOnboardOp.summary = "Phase 1: Tenant self-onboarding form submission";
    tenantOnboardOp.description = "Tenant completes their personal onboarding form (Aadhaar, address, occupation, emergency contact).";
    setRequestBody(tenantOnboardOp, "TenantOnboardRequest");
    setResponse(tenantOnboardOp, "201", "TenantProfileResponse");
  }

  const getMyTenantProfileOp = getOp("/api/tenants/me", "get");
  if (getMyTenantProfileOp) {
    getMyTenantProfileOp.tags = ["Tenant Operations"];
    getMyTenantProfileOp.summary = "Get logged-in tenant's own profile and documents";
    getMyTenantProfileOp.description = "Returns the caller's complete tenant profile with pre-signed document URLs.";
    setResponse(getMyTenantProfileOp, "200", "TenantProfileResponse");
  }

  const patchMyTenantProfileOp = getOp("/api/tenants/me", "patch");
  if (patchMyTenantProfileOp) {
    patchMyTenantProfileOp.tags = ["Tenant Operations"];
    patchMyTenantProfileOp.summary = "Update logged-in tenant's own profile";
    patchMyTenantProfileOp.description = "Allows tenant to update permanent address, emergency contact, or occupation.";
    setRequestBody(patchMyTenantProfileOp, "UpdateTenantProfileRequest");
    setResponse(patchMyTenantProfileOp, "200", "TenantProfileResponse");
  }

  const submitAgreementDocsOp = getOp("/api/tenants/submit-agreement-docs", "post");
  if (submitAgreementDocsOp) {
    submitAgreementDocsOp.tags = ["Tenant Operations"];
    submitAgreementDocsOp.summary = "Phase 2: Submit Aadhar & Photo (Multipart file upload)";
    submitAgreementDocsOp.description = "Uploads Aadhaar card & passport photo to private AWS S3 and marks agreementStatus as SUBMITTED.";
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
    getAllTenantsOp.tags = ["Tenant Operations"];
    getAllTenantsOp.summary = "Get all tenant profiles with unit associations (Admin only)";
    getAllTenantsOp.description = "Retrieves all tenant records with populated user info and pre-signed document URLs.";
    setResponse(getAllTenantsOp, "200", "TenantListResponse");
  }

  const getTenantByIdOp = getOp("/api/tenants/{id}", "get");
  if (getTenantByIdOp) {
    getTenantByIdOp.tags = ["Tenant Operations"];
    getTenantByIdOp.summary = "Get specific tenant profile by ID (Admin or owner)";
    getTenantByIdOp.description = "Fetches a single tenant document by ObjectId with pre-signed document URLs.";
    setResponse(getTenantByIdOp, "200", "TenantProfileResponse");
  }

  const patchTenantByIdOp = getOp("/api/tenants/{id}", "patch");
  if (patchTenantByIdOp) {
    patchTenantByIdOp.tags = ["Tenant Operations"];
    patchTenantByIdOp.summary = "Update tenant profile details (Admin only)";
    patchTenantByIdOp.description = "Admin updates tenant address, contact details, or occupancy.";
    setRequestBody(patchTenantByIdOp, "UpdateTenantProfileRequest");
    setResponse(patchTenantByIdOp, "200", "TenantProfileResponse");
  }

  const deleteTenantOp = getOp("/api/tenants/{id}", "delete");
  if (deleteTenantOp) {
    deleteTenantOp.tags = ["Tenant Operations"];
    deleteTenantOp.summary = "Delete tenant record and dissociate unit (Admin only)";
    deleteTenantOp.description = "Deletes tenant profile, frees assigned unit to vacant, and purges S3 documents.";
    setResponse(deleteTenantOp, "200", "GenericSuccessResponse");
  }

  const patchAgreementStatusOp = getOp("/api/tenants/{id}/agreement-status", "patch");
  if (patchAgreementStatusOp) {
    patchAgreementStatusOp.tags = ["Tenant Operations"];
    patchAgreementStatusOp.summary = "Update agreement status, upload signed PDF, or delete agreement (Admin only)";
    patchAgreementStatusOp.description = "Admin verifies (VERIFIED), rejects (REJECTED), or uploads signed agreement PDF.";
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
    patchRentStatusOp.tags = ["Tenant Operations"];
    patchRentStatusOp.summary = "Quick override tenant rent status (Paid / Pending) backed by ledger (Admin only)";
    patchRentStatusOp.description = "Quick override: 'Paid' records a real PaymentRecord; 'Pending' voids the latest paid month. 'Overdue' is derived.";
    setRequestBody(patchRentStatusOp, "UpdateRentStatusRequest");
    setResponse(patchRentStatusOp, "200", "TenantProfileResponse");
  }

  const getPresignedUrlOp = getOp("/api/tenants/{id}/documents/presigned-url", "get");
  if (getPresignedUrlOp) {
    getPresignedUrlOp.tags = ["Tenant Operations"];
    getPresignedUrlOp.summary = "Generate fresh on-demand Pre-Signed GET URL for a private S3 document";
    getPresignedUrlOp.description = "Generates a time-limited (1-hour) pre-signed download URL for a specific document (aadharCard, passportPhoto, agreementPdf).";
    setResponse(getPresignedUrlOp, "200", "PresignedUrlResponse");
  }

  const submitVacateNoticeOp = getOp("/api/tenants/vacate-notice", "post");
  if (submitVacateNoticeOp) {
    submitVacateNoticeOp.tags = ["Tenant Operations"];
    submitVacateNoticeOp.summary = "Submit move-out notice (Tenant only)";
    submitVacateNoticeOp.description = "Tenant submits intent to move out. Calculates default notice period deadline from room specs.";
    setRequestBody(submitVacateNoticeOp, "CreateTenantVacateNoticeRequest");
    setResponse(submitVacateNoticeOp, "201", "VacateNoticeResponse");
  }

  const getMyVacateNoticeOp = getOp("/api/tenants/my-vacate-notice", "get");
  if (getMyVacateNoticeOp) {
    getMyVacateNoticeOp.tags = ["Tenant Operations"];
    getMyVacateNoticeOp.summary = "Get current active move-out notice for logged-in tenant";
    getMyVacateNoticeOp.description = "Returns any active pending or served move-out notice for the caller's tenancy.";
    setResponse(getMyVacateNoticeOp, "200", "VacateNoticeResponse");
  }

  const getAllVacateNoticesOp = getOp("/api/tenants/vacate-notices", "get");
  if (getAllVacateNoticesOp) {
    getAllVacateNoticesOp.tags = ["Tenant Operations"];
    getAllVacateNoticesOp.summary = "List all move-out notices across properties (Admin only)";
    getAllVacateNoticesOp.description = "Admin inbox filterable by status (PENDING, NOTICE_SERVED, COMPLETED, REJECTED) and initiatedBy (TENANT, ADMIN).";
    setResponse(getAllVacateNoticesOp, "200", "VacateNoticeListResponse");
  }

  const reviewVacateNoticeOp = getOp("/api/tenants/vacate-notices/{id}/review", "patch");
  if (reviewVacateNoticeOp) {
    reviewVacateNoticeOp.tags = ["Tenant Operations"];
    reviewVacateNoticeOp.summary = "Review tenant move-out notice (Admin only)";
    reviewVacateNoticeOp.description = "Admin approves (executes atomic room vacate) or rejects a tenant-submitted move-out notice.";
    setRequestBody(reviewVacateNoticeOp, "ReviewVacateNoticeRequest");
    setResponse(reviewVacateNoticeOp, "200", "VacateNoticeResponse");
  }

  const serveAdminVacateNoticeOp = getOp("/api/tenants/{id}/serve-vacate-notice", "post");
  if (serveAdminVacateNoticeOp) {
    serveAdminVacateNoticeOp.tags = ["Tenant Operations"];
    serveAdminVacateNoticeOp.summary = "Serve move-out / eviction notice to tenant (Admin only)";
    serveAdminVacateNoticeOp.description = "Admin serves formal move-out notice with target deadline and optional reason.";
    setRequestBody(serveAdminVacateNoticeOp, "ServeAdminVacateNoticeRequest");
    setResponse(serveAdminVacateNoticeOp, "201", "VacateNoticeResponse");
  }

  // =========================================================================
  // 4. RENTABLE UNITS MODULE
  // =========================================================================
  const getRentableUnitsOp = getOp("/api/rentable-units", "get");
  if (getRentableUnitsOp) {
    getRentableUnitsOp.tags = ["Rentable Units"];
    getRentableUnitsOp.summary = "List all rentable units with optional filters (Public / Filterable)";
    getRentableUnitsOp.description = "Retrieves units filterable by status (occupied/vacant/pending), type, or property.";
    setResponse(getRentableUnitsOp, "200", "RentableUnitListResponse");
  }

  const getMyUnitOp = getOp("/api/rentable-units/my-unit", "get");
  if (getMyUnitOp) {
    getMyUnitOp.tags = ["Rentable Units"];
    getMyUnitOp.summary = "Get rentable unit assigned to logged-in tenant";
    getMyUnitOp.description = "Returns the full details and specifications of the caller's assigned unit.";
    setResponse(getMyUnitOp, "200", "AssignedUnitDTO");
  }

  const getUnitByIdentifierOp = getOp("/api/rentable-units/{identifier}", "get");
  if (getUnitByIdentifierOp) {
    getUnitByIdentifierOp.tags = ["Rentable Units"];
    getUnitByIdentifierOp.summary = "Get unit details by ObjectId or unitCode (e.g. B-101)";
    getUnitByIdentifierOp.description = "Fetches a unit by its 24-character ObjectId or human-readable unitCode.";
    setResponse(getUnitByIdentifierOp, "200", "DashboardUnitDTO");
  }

  const patchUnitByIdentifierOp = getOp("/api/rentable-units/{identifier}", "patch");
  if (patchUnitByIdentifierOp) {
    patchUnitByIdentifierOp.tags = ["Rentable Units"];
    patchUnitByIdentifierOp.summary = "Update rentable unit specifications, rent, and details (Admin only)";
    patchUnitByIdentifierOp.description = "Admin updates unit rent amount, name, specifications, or snapshots.";
    setRequestBody(patchUnitByIdentifierOp, "UpdateRentableUnitRequest");
    setResponse(patchUnitByIdentifierOp, "200", "DashboardUnitDTO");
  }

  const assignUnitToTenantOp = getOp("/api/rentable-units/{identifier}/assign", "post");
  if (assignUnitToTenantOp) {
    assignUnitToTenantOp.tags = ["Rentable Units"];
    assignUnitToTenantOp.summary = "Assign rentable unit to a tenant (Admin only)";
    assignUnitToTenantOp.description = "Sets unit status to occupied and establishes bidirectional tenant link.";
    setRequestBody(assignUnitToTenantOp, "AssignUnitToTenantRequest");
    setResponse(assignUnitToTenantOp, "200", "DashboardUnitDTO");
  }

  const vacateUnitByPostOp = getOp("/api/rentable-units/{identifier}/vacate", "post");
  if (vacateUnitByPostOp) {
    vacateUnitByPostOp.tags = ["Rentable Units"];
    vacateUnitByPostOp.summary = "Vacate rentable unit atomically and preserve tenant history (Admin only)";
    vacateUnitByPostOp.description = "Atomically snapshots unit onto tenant, marks tenancyStatus as VACATED, resets unit to vacant, and completes open notices.";
    setRequestBody(vacateUnitByPostOp, "VacateUnitRequest");
    setResponse(vacateUnitByPostOp, "200", "DashboardUnitDTO");
  }

  // =========================================================================
  // 5. PROPERTY DASHBOARD MODULE
  // =========================================================================
  const getDashboardOp = getOp("/api/dashboard", "get");
  if (getDashboardOp) {
    getDashboardOp.tags = ["Property Dashboard"];
    getDashboardOp.summary = "Get aggregated property tree with floors, units, tenant IDs, and pre-signed document URLs";
    getDashboardOp.description = "Returns the primary hierarchical building layout tree used by the frontend interactive dashboard.";
    setResponse(getDashboardOp, "200", "DashboardTreeResponse");
  }

  const getDashboardPropertiesOp = getOp("/api/dashboard/properties", "get");
  if (getDashboardPropertiesOp) {
    getDashboardPropertiesOp.tags = ["Property Dashboard"];
    getDashboardPropertiesOp.summary = "List unique building/property names and IDs";
    getDashboardPropertiesOp.description = "Fetches a quick list of top-level building property identifiers and display labels.";
    setResponse(getDashboardPropertiesOp, "200", "GenericSuccessResponse");
  }

  // =========================================================================
  // 6. PAYMENT MANAGEMENT MODULE
  // =========================================================================
  const recordPaymentOp = getOp("/api/payments/record", "post");
  if (recordPaymentOp) {
    recordPaymentOp.tags = ["Payment Management"];
    recordPaymentOp.summary = "Record offline payment for single or multi-month lump sum with FIFO settlement (Admin only)";
    recordPaymentOp.description = "Records payment, settles oldest unpaid months in FIFO order, enforces debt ceiling, and syncs tenant rentStatus.";
    setRequestBody(recordPaymentOp, "RecordPaymentRequest");
    setResponse(recordPaymentOp, "201", "PaymentRecordResponse");
  }

  const getAllPaymentsOp = getOp("/api/payments", "get");
  if (getAllPaymentsOp) {
    getAllPaymentsOp.tags = ["Payment Management"];
    getAllPaymentsOp.summary = "Filterable payment ledger across properties (by tenant, unit, month, method) (Admin only)";
    getAllPaymentsOp.description = "Admin payment receipts log filterable by date range, payment method, unit, or tenant.";
    setResponse(getAllPaymentsOp, "200", "PaymentRecordListResponse");
  }

  const getMyLedgerOp = getOp("/api/payments/my-ledger", "get");
  if (getMyLedgerOp) {
    getMyLedgerOp.tags = ["Payment Management"];
    getMyLedgerOp.summary = "Get logged-in tenant's rent breakdown, paid months, overdue arrears, and receipts";
    getMyLedgerOp.description = "Returns personal rent ledger, current month status, maxAcceptableAmount, and historical payment receipts.";
    setResponse(getMyLedgerOp, "200", "PaymentLedgerResponse");
  }

  const getTenantLedgerOp = getOp("/api/payments/tenant/{tenantId}/ledger", "get");
  if (getTenantLedgerOp) {
    getTenantLedgerOp.tags = ["Payment Management"];
    getTenantLedgerOp.summary = "Get detailed rent ledger and arrears breakdown for a tenant (Admin or owner)";
    getTenantLedgerOp.description = "Calculates total unpaid months, totalDueAmount, maxAcceptableAmount, and full receipt history.";
    setResponse(getTenantLedgerOp, "200", "PaymentLedgerResponse");
  }

  const deletePaymentOp = getOp("/api/payments/{id}", "delete");
  if (deletePaymentOp) {
    deletePaymentOp.tags = ["Payment Management"];
    deletePaymentOp.summary = "Void/delete a payment record and re-evaluate tenant rent status (Admin only)";
    deletePaymentOp.description = "Voids a mistaken payment record, re-opens the settled months as unpaid/overdue, and recalculates ledger.";
    setResponse(deletePaymentOp, "200", "GenericSuccessResponse");
  }

  // =========================================================================
  // 7. PAYMENT DESTINATIONS MODULE
  // =========================================================================
  const getActivePaymentMethodOp = getOp("/api/payment-methods", "get");
  if (getActivePaymentMethodOp) {
    getActivePaymentMethodOp.tags = ["Payment Destinations"];
    getActivePaymentMethodOp.summary = "Get active default payment destination for tenant rent payments";
    getActivePaymentMethodOp.description = "Returns primary UPI ID or bank account details displayed to tenants for offline rent transfer.";
    setResponse(getActivePaymentMethodOp, "200", "GenericSuccessResponse");
  }

  const createPaymentMethodOp = getOp("/api/payment-methods", "post");
  if (createPaymentMethodOp) {
    createPaymentMethodOp.tags = ["Payment Destinations"];
    createPaymentMethodOp.summary = "Create UPI / Bank Transfer / Cash payment destination (Admin only)";
    createPaymentMethodOp.description = "Creates a new payment destination record with IFSC / UPI VPA format validation.";
    setRequestBody(createPaymentMethodOp, "CreatePaymentMethodRequest");
    setResponse(createPaymentMethodOp, "201", "GenericSuccessResponse");
  }

  const getPaymentMethodByIdOp = getOp("/api/payment-methods/{id}", "get");
  if (getPaymentMethodByIdOp) {
    getPaymentMethodByIdOp.tags = ["Payment Destinations"];
    getPaymentMethodByIdOp.summary = "Get payment destination details by ID (Admin only)";
    getPaymentMethodByIdOp.description = "Fetches a specific payment method configuration by ObjectId.";
    setResponse(getPaymentMethodByIdOp, "200", "GenericSuccessResponse");
  }

  const patchPaymentMethodOp = getOp("/api/payment-methods/{id}", "patch");
  if (patchPaymentMethodOp) {
    patchPaymentMethodOp.tags = ["Payment Destinations"];
    patchPaymentMethodOp.summary = "Update payment destination details (Admin only)";
    patchPaymentMethodOp.description = "Updates UPI ID, bank account details, or cash collection contact person.";
    setRequestBody(patchPaymentMethodOp, "UpdatePaymentMethodRequest");
    setResponse(patchPaymentMethodOp, "200", "GenericSuccessResponse");
  }

  const deletePaymentMethodOp = getOp("/api/payment-methods/{id}", "delete");
  if (deletePaymentMethodOp) {
    deletePaymentMethodOp.tags = ["Payment Destinations"];
    deletePaymentMethodOp.summary = "Delete payment destination (Admin only)";
    deletePaymentMethodOp.description = "Permanently removes a payment destination option.";
    setResponse(deletePaymentMethodOp, "200", "GenericSuccessResponse");
  }

  const getAllPaymentMethodsAdminOp = getOp("/api/payment-methods/admin/all", "get");
  if (getAllPaymentMethodsAdminOp) {
    getAllPaymentMethodsAdminOp.tags = ["Payment Destinations"];
    getAllPaymentMethodsAdminOp.summary = "Get all payment destinations including inactive (Admin only)";
    getAllPaymentMethodsAdminOp.description = "Lists all configured payment methods across active and disabled states.";
    setResponse(getAllPaymentMethodsAdminOp, "200", "GenericSuccessResponse");
  }

  const togglePaymentMethodActiveOp = getOp("/api/payment-methods/{id}/toggle-active", "patch");
  if (togglePaymentMethodActiveOp) {
    togglePaymentMethodActiveOp.tags = ["Payment Destinations"];
    togglePaymentMethodActiveOp.summary = "Toggle payment destination active/inactive state (Admin only)";
    togglePaymentMethodActiveOp.description = "Enables or disables a payment destination from being visible to tenants.";
    setResponse(togglePaymentMethodActiveOp, "200", "GenericSuccessResponse");
  }

  const setPrimaryPaymentMethodOp = getOp("/api/payment-methods/{id}/set-primary", "patch");
  if (setPrimaryPaymentMethodOp) {
    setPrimaryPaymentMethodOp.tags = ["Payment Destinations"];
    setPrimaryPaymentMethodOp.summary = "Set payment destination as primary default for rent collection (Admin only)";
    setPrimaryPaymentMethodOp.description = "Marks this payment method as the default destination and demotes others.";
    setResponse(setPrimaryPaymentMethodOp, "200", "GenericSuccessResponse");
  }

  // Write enriched specification back to file
  fs.writeFileSync(outputFile, JSON.stringify(rawData, null, 2), "utf-8");
  console.log("Swagger OpenAPI 3.0 specification with complete module clustering generated successfully! ✔");
};

runGenerator();
