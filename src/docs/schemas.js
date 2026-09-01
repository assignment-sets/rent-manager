export const getComponentSchemas = () => ({
  // =========================================================================
  // 1. AUTH & USER REQUEST DTOs
  // =========================================================================
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "admin@rentmanager.com",
        description: "Registered email address",
      },
      password: {
        type: "string",
        format: "password",
        example: "Admin@12345",
        description: "Account password (min 6 characters)",
      },
    },
  },

  BootstrapAdminRequest: {
    type: "object",
    required: ["name", "email", "password", "phone"],
    properties: {
      name: { type: "string", example: "Gourab Mondal" },
      email: { type: "string", format: "email", example: "admin@rentmanager.com" },
      password: { type: "string", format: "password", example: "Admin@12345" },
      phone: { type: "string", example: "9876543210" },
    },
  },

  OnboardTenantAuthRequest: {
    type: "object",
    required: ["name", "email", "phone", "unitCode"],
    properties: {
      name: { type: "string", example: "Rahul Sharma", description: "Tenant full name" },
      email: { type: "string", format: "email", example: "rahul.sharma@gmail.com" },
      phone: {
        type: "string",
        pattern: "^(?:(?:\\+|0{0,2})91[\\s\\-]?)?(?:0[\\s\\-]?)?[6-9]\\d{9}$",
        example: "9674752566",
        description: "10-digit Indian phone with optional +91",
      },
      unitCode: { type: "string", example: "B-101", description: "Unit code to reserve (e.g. B-101)" },
      temporaryPassword: {
        type: "string",
        example: "Tenant@12345",
        description: "Initial temporary password (defaults to Tenant@12345 if omitted)",
      },
    },
  },

  UpdateProfileRequest: {
    type: "object",
    properties: {
      name: { type: "string", example: "Rahul Sharma" },
      phone: { type: "string", pattern: "^(?:(?:\\+|0{0,2})91[\\s\\-]?)?(?:0[\\s\\-]?)?[6-9]\\d{9}$", example: "9674752566" },
    },
  },

  AssignUnitRequest: {
    type: "object",
    required: ["unitId"],
    properties: {
      unitId: {
        type: "string",
        pattern: "^[0-9a-fA-F]{24}$",
        example: "6a7ed5fea18dd1025225a0f0",
        description: "RentableUnit 24-character ObjectId",
      },
    },
  },

  UpdateRoleRequest: {
    type: "object",
    required: ["role"],
    properties: {
      role: {
        type: "string",
        enum: ["ADMIN", "TENANT", "SUPERADMIN"],
        example: "ADMIN",
      },
    },
  },

  // =========================================================================
  // 2. TENANT REQUEST DTOs
  // =========================================================================
  TenantOnboardRequest: {
    type: "object",
    required: [
      "aadharNumber",
      "permanentAddress",
      "occupation",
      "emergencyContact",
    ],
    properties: {
      phone: {
        type: "string",
        pattern: "^(?:(?:\\+|0{0,2})91[\\s\\-]?)?(?:0[\\s\\-]?)?[6-9]\\d{9}$",
        example: "9674752566",
      },
      whatsappPhone: {
        type: "string",
        pattern: "^(?:(?:\\+|0{0,2})91[\\s\\-]?)?(?:0[\\s\\-]?)?[6-9]\\d{9}$",
        example: "9674752566",
      },
      aadharNumber: {
        type: "string",
        pattern: "^(?:\\d{4}[-\\s]?){3}$|^\\d{12}$",
        example: "5412-8921-9812",
        description: "12-digit Indian Aadhar number (formatted or raw digits)",
      },
      permanentAddress: {
        type: "string",
        example: "Flat 4B, Salt Lake Sector V, Kolkata, WB - 700091",
      },
      occupation: {
        type: "string",
        enum: [
          "Private Sector",
          "Government / Public Sector",
          "Business / Self-Employed",
          "Student",
          "Doctor / Healthcare",
          "Engineer / IT Professional",
          "Teacher / Professor",
          "Lawyer / Legal",
          "Retired",
          "Homemaker",
          "Freelancer",
          "Other",
        ],
        example: "Private Sector",
      },
      occupancyType: {
        type: "string",
        enum: ["Solo / Bachelor", "Couple", "Family", "Sharing"],
        default: "Solo / Bachelor",
        example: "Solo / Bachelor",
      },
      occupantsCount: {
        type: "integer",
        minimum: 1,
        default: 1,
        example: 1,
      },
      moveInDate: {
        type: "string",
        format: "date-time",
        example: "2026-08-01T00:00:00.000Z",
      },
      leaseEnd: {
        type: "string",
        format: "date-time",
        example: "2027-07-31T00:00:00.000Z",
      },
      rentDueDate: {
        type: "string",
        example: "5th of every month",
      },
      emergencyContact: {
        $ref: "#/components/schemas/EmergencyContactInput",
      },
    },
  },

  EmergencyContactInput: {
    type: "object",
    required: ["name", "relation", "phone"],
    properties: {
      name: { type: "string", example: "Gourab Mondal" },
      relation: {
        type: "string",
        enum: [
          "Parent",
          "Spouse",
          "Sibling",
          "Guardian",
          "Friend",
          "Colleague",
          "Relative",
          "Other",
        ],
        example: "Guardian",
      },
      phone: {
        type: "string",
        pattern: "^(?:(?:\\+|0{0,2})91[\\s\\-]?)?(?:0[\\s\\-]?)?[6-9]\\d{9}$",
        example: "9876543210",
      },
    },
  },

  UpdateAgreementStatusRequest: {
    type: "object",
    properties: {
      agreementStatus: {
        type: "string",
        enum: ["NOT_SUBMITTED", "SUBMITTED", "VERIFIED", "REJECTED", "FAILED"],
        example: "VERIFIED",
      },
      isAgreementVerified: { type: "boolean", example: true },
      agreementPdfUrl: {
        type: "string",
        example: "https://rent-manager-vault.s3.ap-south-1.amazonaws.com/agreements/123/signed_agreement.pdf",
      },
      rejectionReason: {
        type: "string",
        example: "Aadhar photo is blurry. Please upload clear scan.",
      },
      deleteAgreementPdf: {
        type: "boolean",
        example: false,
        description: "Set to true to permanently purge all versions of the signed agreement PDF from S3",
      },
    },
  },

  UpdateRentStatusRequest: {
    type: "object",
    required: ["rentStatus"],
    properties: {
      rentStatus: {
        type: "string",
        enum: ["Paid", "Pending"],
        example: "Paid",
        description: "Status override. 'Overdue' is a derived ledger calculation and cannot be manually set.",
      },
      rentDueDate: { type: "string", example: "5th of every month" },
    },
  },

  UpdateTenantProfileRequest: {
    type: "object",
    properties: {
      phone: { type: "string", example: "9674752566" },
      whatsappPhone: { type: "string", example: "9674752566" },
      permanentAddress: { type: "string", example: "Flat 4B, Salt Lake, Kolkata" },
      occupation: { type: "string", example: "Private Sector" },
      occupancyType: { type: "string", example: "Solo / Bachelor" },
      occupantsCount: { type: "integer", example: 1 },
      emergencyContact: { $ref: "#/components/schemas/EmergencyContactInput" },
    },
  },

  UpdateRentableUnitRequest: {
    type: "object",
    properties: {
      name: { type: "string", example: "Room 101 (Executive Suite)" },
      type: { type: "string", example: "1 BHK" },
      rent: { type: "number", example: 5000 },
      color: { type: "string", example: "#10b981" },
      bio: { type: "string", example: "Corner flat with open balcony" },
      status: {
        type: "string",
        enum: ["occupied", "vacant", "pending"],
        example: "vacant",
      },
      specs: { $ref: "#/components/schemas/UnitSpecsDTO" },
      snapshots: { $ref: "#/components/schemas/UnitSnapshotsDTO" },
    },
  },

  AssignUnitToTenantRequest: {
    type: "object",
    required: ["tenantId"],
    properties: {
      tenantId: {
        type: "string",
        pattern: "^[0-9a-fA-F]{24}$",
        example: "6a816455c820f80677ef266d",
        description: "Tenant profile 24-character ObjectId",
      },
    },
  },

  VacateUnitRequest: {
    type: "object",
    properties: {
      vacateReason: {
        type: "string",
        example: "Lease agreement term completed naturally",
      },
    },
  },

  CreateTenantVacateNoticeRequest: {
    type: "object",
    properties: {
      intendedVacateDate: {
        type: "string",
        format: "date-time",
        example: "2026-10-15T00:00:00.000Z",
        description: "Target move-out date (defaults to today + notice period months if omitted)",
      },
      reason: {
        type: "string",
        example: "Relocating to another city for employment",
      },
    },
  },

  ServeAdminVacateNoticeRequest: {
    type: "object",
    required: ["intendedVacateDate"],
    properties: {
      intendedVacateDate: {
        type: "string",
        format: "date-time",
        example: "2026-10-31T00:00:00.000Z",
        description: "Formal move-out deadline date served by admin",
      },
      reason: {
        type: "string",
        example: "Scheduled property structural renovation work",
      },
      adminNotes: {
        type: "string",
        example: "Security deposit reconciliation will be processed upon inspection",
      },
    },
  },

  ReviewVacateNoticeRequest: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["APPROVE_AND_VACATE", "REJECT"],
        example: "APPROVE_AND_VACATE",
        description: "APPROVE_AND_VACATE executes atomic room vacating; REJECT cancels notice",
      },
      adminNotes: {
        type: "string",
        example: "Key handover scheduled for 5 PM",
      },
    },
  },


  // =========================================================================
  // 3. PAYMENT REQUEST DTOs
  // =========================================================================
  RecordPaymentRequest: {
    type: "object",
    required: ["tenantId", "amount"],
    properties: {
      tenantId: {
        type: "string",
        pattern: "^[0-9a-fA-F]{24}$",
        example: "6a816455c820f80677ef266d",
        description: "Target Tenant profile ObjectId",
      },
      amount: {
        type: "number",
        minimum: 1,
        example: 9000,
        description: "Total payment amount in INR (e.g. ₹9,000 for 2 months)",
      },
      monthsCovered: {
        type: "array",
        items: {
          type: "string",
          pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
          example: "2026-08",
        },
        example: ["2026-06", "2026-07"],
        description: "List of YYYY-MM months settled (Leave empty for automatic FIFO allocation)",
      },
      paymentMethod: {
        type: "string",
        enum: ["UPI", "Bank Transfer", "Cash", "Cheque", "Other"],
        default: "UPI",
        example: "UPI",
      },
      transactionReference: {
        type: "string",
        example: "UPI-UTR-49120491024",
        description: "Bank UTR, transaction ID, or cash receipt number",
      },
      notes: {
        type: "string",
        example: "Paid 2 months rent via Google Pay",
      },
      paidAt: {
        type: "string",
        format: "date-time",
        example: "2026-08-27T18:00:00.000Z",
      },
    },
  },

  CreatePaymentMethodRequest: {
    type: "object",
    required: ["type"],
    properties: {
      type: {
        type: "string",
        enum: ["UPI", "Bank Transfer", "Cash"],
        example: "UPI",
      },
      isDefault: { type: "boolean", default: false, example: true },
      upiDetails: {
        type: "object",
        properties: {
          upiId: { type: "string", example: "gourabmondal@oksbi" },
          payeeName: { type: "string", example: "Gourab Mondal" },
        },
      },
      bankDetails: {
        type: "object",
        properties: {
          accountNumber: { type: "string", example: "38920194812" },
          ifscCode: { type: "string", example: "SBIN0001234" },
          accountHolderName: { type: "string", example: "Gourab Mondal" },
          bankName: { type: "string", example: "State Bank of India" },
          accountType: { type: "string", enum: ["Savings", "Current"], example: "Savings" },
        },
      },
      cashDetails: {
        type: "object",
        properties: {
          collectionPersonName: { type: "string", example: "Gourab Mondal" },
          contactPhone: { type: "string", example: "9876543210" },
        },
      },
    },
  },

  UpdatePaymentMethodRequest: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["UPI", "Bank Transfer", "Cash"], example: "UPI" },
      isDefault: { type: "boolean", example: true },
      upiDetails: { type: "object" },
      bankDetails: { type: "object" },
      cashDetails: { type: "object" },
    },
  },

  // =========================================================================
  // 4. RESPONSE DTOs & SUB-MODELS
  // =========================================================================
  AuthLoginResponse: {
    type: "object",
    required: ["success", "message", "token"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Login successful" },
      token: {
        type: "string",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhODE0MTkwMDc5NTE0NTVkZjk3ZjAwMyIsInJvbGUiOiJBRE1JTiJ9...",
      },
    },
  },

  UserProfileResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "User profile retrieved successfully" },
      data: {
        $ref: "#/components/schemas/UserDTO",
      },
    },
  },

  UserDTO: {
    type: "object",
    required: ["id", "name", "email", "phone", "role"],
    properties: {
      id: { type: "string", example: "6a81419007951455df97f003" },
      name: { type: "string", example: "Rahul Sharma" },
      email: { type: "string", format: "email", example: "rahul.sharma@gmail.com" },
      phone: { type: "string", example: "9674752566" },
      role: { type: "string", enum: ["ADMIN", "TENANT", "SUPERADMIN"], example: "TENANT" },
      assignedUnit: {
        $ref: "#/components/schemas/AssignedUnitDTO",
      },
    },
  },

  AssignedUnitDTO: {
    type: "object",
    required: ["id", "unitCode", "name", "type", "rent", "status"],
    properties: {
      id: { type: "string", example: "6a7ed5fea18dd1025225a0f0" },
      unitCode: { type: "string", example: "B-101" },
      name: { type: "string", example: "Room 101" },
      type: { type: "string", example: "1 BHK" },
      rent: { type: "number", example: 4500 },
      status: { type: "string", enum: ["occupied", "vacant", "pending"], example: "occupied" },
    },
  },

  TenantProfileResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Tenant profile retrieved successfully" },
      data: {
        $ref: "#/components/schemas/TenantProfileDTO",
      },
    },
  },

  TenantProfileDTO: {
    type: "object",
    required: [
      "id",
      "userId",
      "agreementStatus",
      "isAgreementVerified",
      "rentStatus",
      "documents",
    ],
    properties: {
      id: { type: "string", example: "6a816455c820f80677ef266d" },
      userId: {
        $ref: "#/components/schemas/TenantUserSummaryDTO",
      },
      name: { type: "string", example: "Rahul Sharma" },
      phone: { type: "string", example: "9674752566" },
      whatsappPhone: { type: "string", example: "9674752566" },
      aadharNumber: { type: "string", example: "5412-8921-9812" },
      permanentAddress: { type: "string", example: "Flat 4B, Salt Lake Sector V, Kolkata" },
      occupation: { type: "string", example: "Private Sector" },
      occupancyType: { type: "string", example: "Solo / Bachelor" },
      occupantsCount: { type: "integer", example: 1 },
      agreementStatus: {
        type: "string",
        enum: ["NOT_SUBMITTED", "SUBMITTED", "VERIFIED", "REJECTED", "FAILED"],
        example: "VERIFIED",
      },
      rejectionReason: { type: "string", example: "" },
      isAgreementVerified: { type: "boolean", example: true },
      rentStatus: {
        type: "string",
        enum: ["Paid", "Pending", "Overdue"],
        example: "Paid",
      },
      rentDueDate: { type: "string", example: "5th of every month" },
      tenancyStatus: {
        type: "string",
        enum: ["ACTIVE", "VACATED"],
        example: "ACTIVE",
      },
      vacatedAt: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: null,
      },
      vacateReason: { type: "string", example: "" },
      moveInDate: { type: "string", format: "date-time", example: "2026-08-01T00:00:00.000Z" },
      daysOccupied: { type: "integer", example: 27 },
      leaseEnd: { type: "string", format: "date-time", example: "2027-07-31T00:00:00.000Z" },
      documents: {
        $ref: "#/components/schemas/TenantDocumentsDTO",
      },
      emergencyContact: {
        $ref: "#/components/schemas/EmergencyContactDTO",
      },
      assignedUnit: {
        $ref: "#/components/schemas/AssignedUnitDTO",
      },
    },
  },

  VacateNoticeDTO: {
    type: "object",
    required: ["_id", "tenantId", "userId", "unitId", "unitCode", "initiatedBy", "intendedVacateDate", "status"],
    properties: {
      _id: { type: "string", example: "6a817455c820f80677ef339a" },
      tenantId: { type: "string", example: "6a816455c820f80677ef266d" },
      userId: { type: "string", example: "6a81419007951455df97f003" },
      unitId: { type: "string", example: "6a7ed5fea18dd1025225a0f0" },
      unitCode: { type: "string", example: "B-101" },
      initiatedBy: { type: "string", enum: ["TENANT", "ADMIN"], example: "TENANT" },
      noticePeriodMonths: { type: "number", example: 1 },
      noticeDate: { type: "string", format: "date-time", example: "2026-09-01T00:00:00.000Z" },
      intendedVacateDate: { type: "string", format: "date-time", example: "2026-10-01T00:00:00.000Z" },
      reason: { type: "string", example: "Relocating for work" },
      status: {
        type: "string",
        enum: ["PENDING", "NOTICE_SERVED", "COMPLETED", "REJECTED", "CANCELLED"],
        example: "PENDING",
      },
      adminNotes: { type: "string", example: "" },
      resolvedAt: { type: "string", format: "date-time", nullable: true, example: null },
      resolvedBy: { type: "string", nullable: true, example: null },
      createdAt: { type: "string", format: "date-time", example: "2026-09-01T08:00:00.000Z" },
      updatedAt: { type: "string", format: "date-time", example: "2026-09-01T08:00:00.000Z" },
    },
  },

  VacateNoticeResponse: {
    type: "object",
    required: ["success"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Move-out notice retrieved successfully" },
      data: { $ref: "#/components/schemas/VacateNoticeDTO" },
    },
  },

  VacateNoticeListResponse: {
    type: "object",
    required: ["success", "count", "data"],
    properties: {
      success: { type: "boolean", example: true },
      count: { type: "integer", example: 1 },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/VacateNoticeDTO" },
      },
    },
  },


  TenantUserSummaryDTO: {
    type: "object",
    required: ["_id", "name", "email", "phone"],
    properties: {
      _id: { type: "string", example: "6a81419007951455df97f003" },
      name: { type: "string", example: "Rahul Sharma" },
      email: { type: "string", format: "email", example: "rahul.sharma@gmail.com" },
      phone: { type: "string", example: "9674752566" },
    },
  },

  TenantDocumentsDTO: {
    type: "object",
    properties: {
      aadharCard: { $ref: "#/components/schemas/DocumentItemDTO" },
      passportPhoto: { $ref: "#/components/schemas/DocumentItemDTO" },
      agreementPdf: { $ref: "#/components/schemas/DocumentItemDTO" },
      additionalDocs: {
        type: "array",
        items: { $ref: "#/components/schemas/AdditionalDocItemDTO" },
      },
    },
  },

  DocumentItemDTO: {
    type: "object",
    required: ["url"],
    properties: {
      url: {
        type: "string",
        example: "https://rent-manager-vault.s3.ap-south-1.amazonaws.com/tenants/123/aadhar.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...",
        description: "Authenticated pre-signed GET URL valid for 1 hour",
      },
      key: {
        type: "string",
        example: "tenants/6a81419007951455df97f003/aadharCard_1787560563905.pdf",
        description: "Canonical S3 key path",
      },
      uploadedAt: {
        type: "string",
        format: "date-time",
        example: "2026-08-24T08:36:05.090Z",
      },
    },
  },

  AdditionalDocItemDTO: {
    type: "object",
    required: ["title", "url"],
    properties: {
      title: { type: "string", example: "PAN Card" },
      url: { type: "string", example: "https://rent-manager-vault.s3.../pan.pdf?X-Amz-Signature=..." },
      key: { type: "string", example: "tenants/123/pan.pdf" },
      uploadedAt: { type: "string", format: "date-time" },
    },
  },

  EmergencyContactDTO: {
    type: "object",
    required: ["name", "relation", "phone"],
    properties: {
      name: { type: "string", example: "Gourab Mondal" },
      relation: { type: "string", example: "Guardian" },
      phone: { type: "string", example: "9876543210" },
    },
  },

  DashboardTreeResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      data: {
        type: "array",
        items: {
          $ref: "#/components/schemas/DashboardPropertyDTO",
        },
      },
    },
  },

  DashboardPropertyDTO: {
    type: "object",
    required: ["id", "name", "type", "floors"],
    properties: {
      id: { type: "string", example: "plot-b" },
      name: { type: "string", example: "B-Block Building" },
      subtitle: { type: "string", example: "Residential Suites" },
      type: { type: "string", example: "building" },
      gridPos: { type: "string", example: "col-span-1" },
      floors: {
        type: "array",
        items: {
          $ref: "#/components/schemas/DashboardFloorDTO",
        },
      },
    },
  },

  DashboardFloorDTO: {
    type: "object",
    required: ["level", "label", "units"],
    properties: {
      level: { type: "integer", example: 1 },
      label: { type: "string", example: "Floor 1" },
      units: {
        type: "array",
        items: {
          $ref: "#/components/schemas/DashboardUnitDTO",
        },
      },
    },
  },

  DashboardUnitDTO: {
    type: "object",
    required: ["id", "name", "type", "rent", "status"],
    properties: {
      id: { type: "string", example: "B-101", description: "String unit code matching UI" },
      name: { type: "string", example: "Room 101" },
      type: { type: "string", example: "1 BHK" },
      rent: { type: "number", example: 4500 },
      status: { type: "string", enum: ["occupied", "vacant", "pending"], example: "occupied" },
      color: { type: "string", example: "#10b981" },
      bio: { type: "string", example: "Corner 1 BHK flat with open balcony" },
      specs: { $ref: "#/components/schemas/UnitSpecsDTO" },
      snapshots: { $ref: "#/components/schemas/UnitSnapshotsDTO" },
      tenant: {
        $ref: "#/components/schemas/DashboardTenantDTO",
      },
    },
  },

  UnitSpecsDTO: {
    type: "object",
    properties: {
      address: { type: "string", example: "Block B, Room 101" },
      floorLevel: { type: "string", example: "1st Floor" },
      bedrooms: { type: "integer", example: 1 },
      bathrooms: { type: "integer", example: 1 },
      sqft: { type: "integer", example: 450 },
      furnishing: { type: "string", enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"], example: "Semi-Furnished" },
      securityDeposit: { type: "number", example: 9000 },
    },
  },

  UnitSnapshotsDTO: {
    type: "object",
    properties: {
      coverImage: { type: "string", example: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" },
      gallery: { type: "array", items: { type: "object" } },
      virtualTourUrl: { type: "string", nullable: true, example: null },
    },
  },

  DashboardTenantDTO: {
    type: "object",
    required: ["id", "userId", "name", "phone", "agreementStatus", "isAgreementVerified", "rentStatus"],
    properties: {
      id: { type: "string", example: "6a816455c820f80677ef266d", description: "Tenant document ObjectId" },
      userId: { type: "string", example: "6a81419007951455df97f003", description: "Auth User ObjectId" },
      name: { type: "string", example: "Rahul Sharma" },
      phone: { type: "string", example: "9674752566" },
      whatsappPhone: { type: "string", example: "9674752566" },
      email: { type: "string", example: "rahul.sharma@gmail.com" },
      aadhar: { type: "string", example: "5412-8921-9812" },
      permanentAddress: { type: "string", example: "Flat 4B, Salt Lake, Kolkata" },
      occupation: { type: "string", example: "Private Sector" },
      occupancyType: { type: "string", example: "Solo / Bachelor" },
      occupantsCount: { type: "integer", example: 1 },
      agreementStatus: {
        type: "string",
        enum: ["NOT_SUBMITTED", "SUBMITTED", "VERIFIED", "REJECTED", "FAILED"],
        example: "VERIFIED",
      },
      rejectionReason: { type: "string", example: "" },
      isAgreementVerified: { type: "boolean", example: true },
      documents: { $ref: "#/components/schemas/TenantDocumentsDTO" },
      moveInDate: { type: "string", example: "24 Aug 2026" },
      daysOccupied: { type: "integer", example: 4 },
      leaseEnd: { type: "string", example: "24 Jul 2027" },
      rentStatus: { type: "string", enum: ["Paid", "Pending", "Overdue"], example: "Pending" },
      rentDueDate: { type: "string", example: "5th of every month" },
      emergencyContact: { $ref: "#/components/schemas/EmergencyContactDTO" },
    },
  },

  PaymentLedgerResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      data: {
        $ref: "#/components/schemas/PaymentLedgerDTO",
      },
    },
  },

  PaymentLedgerDTO: {
    type: "object",
    required: [
      "tenantId",
      "monthlyRent",
      "rentStatus",
      "summary",
      "breakdown",
      "history",
    ],
    properties: {
      tenantId: { type: "string", example: "6a816455c820f80677ef266d" },
      monthlyRent: { type: "number", example: 4500 },
      moveInDate: { type: "string", format: "date-time", example: "2026-05-10T00:00:00.000Z" },
      rentDueDate: { type: "string", example: "5th of every month" },
      rentStatus: { type: "string", enum: ["Paid", "Pending", "Overdue"], example: "Overdue" },
      summary: {
        $ref: "#/components/schemas/LedgerSummaryDTO",
      },
      breakdown: {
        $ref: "#/components/schemas/LedgerBreakdownDTO",
      },
      history: {
        type: "array",
        items: {
          $ref: "#/components/schemas/PaymentRecordDTO",
        },
      },
    },
  },

  LedgerSummaryDTO: {
    type: "object",
    required: [
      "totalMonthsSinceMoveIn",
      "paidMonthsCount",
      "overdueMonthsCount",
      "isCurrentMonthPaid",
      "totalUnpaidMonths",
      "totalDueAmount",
      "maxAcceptableAmount",
      "overallStatus",
    ],
    properties: {
      totalMonthsSinceMoveIn: { type: "integer", example: 4 },
      paidMonthsCount: { type: "integer", example: 1 },
      overdueMonthsCount: { type: "integer", example: 2 },
      isCurrentMonthPaid: { type: "boolean", example: false },
      totalUnpaidMonths: { type: "integer", example: 3 },
      totalDueAmount: { type: "number", example: 13500 },
      maxAcceptableAmount: {
        type: "number",
        example: 13500,
        description: "Maximum allowable payment amount equal to cumulative outstanding dues",
      },
      overallStatus: { type: "string", enum: ["Paid", "Pending", "Overdue"], example: "Overdue" },
    },
  },

  LedgerBreakdownDTO: {
    type: "object",
    required: ["paidMonths", "overdueMonths", "currentMonth"],
    properties: {
      paidMonths: {
        type: "array",
        items: { type: "string", example: "2026-05" },
        example: ["2026-05"],
      },
      overdueMonths: {
        type: "array",
        items: { type: "string", example: "2026-06" },
        example: ["2026-06", "2026-07"],
      },
      currentMonth: {
        $ref: "#/components/schemas/CurrentMonthStatusDTO",
      },
    },
  },

  CurrentMonthStatusDTO: {
    type: "object",
    required: ["month", "isPaid", "status"],
    properties: {
      month: { type: "string", example: "2026-08" },
      isPaid: { type: "boolean", example: false },
      status: { type: "string", enum: ["Paid", "Pending", "Overdue"], example: "Pending" },
    },
  },

  PaymentRecordDTO: {
    type: "object",
    required: ["_id", "tenantId", "amount", "monthsCovered", "paymentMethod", "paidAt"],
    properties: {
      _id: { type: "string", example: "6a819abf1049281a05b97722" },
      tenantId: { type: "string", example: "6a816455c820f80677ef266d" },
      userId: { type: "string", example: "6a81419007951455df97f003" },
      unitId: { type: "string", example: "6a7ed5fea18dd1025225a0f0" },
      amount: { type: "number", example: 9000 },
      monthsCovered: {
        type: "array",
        items: { type: "string" },
        example: ["2026-06", "2026-07"],
      },
      paymentMethod: {
        type: "string",
        enum: ["UPI", "Bank Transfer", "Cash", "Cheque", "Other"],
        example: "UPI",
      },
      transactionReference: { type: "string", example: "UPI-UTR-49120491024" },
      notes: { type: "string", example: "Paid 2 months rent via GPay" },
      paidAt: { type: "string", format: "date-time", example: "2026-08-27T18:00:00.000Z" },
      recordedBy: {
        $ref: "#/components/schemas/AdminUserSummaryDTO",
      },
    },
  },

  AdminUserSummaryDTO: {
    type: "object",
    required: ["name", "email"],
    properties: {
      name: { type: "string", example: "Admin" },
      email: { type: "string", format: "email", example: "admin@rentmanager.com" },
    },
  },

  PaymentRecordResponse: {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: { type: "boolean", example: true },
      message: {
        type: "string",
        example: "Payment recorded successfully and rent status synchronized",
      },
      data: {
        $ref: "#/components/schemas/PaymentRecordDataDTO",
      },
    },
  },

  PaymentRecordDataDTO: {
    type: "object",
    required: ["paymentRecord", "ledger"],
    properties: {
      paymentRecord: { $ref: "#/components/schemas/PaymentRecordDTO" },
      ledger: { $ref: "#/components/schemas/PaymentLedgerDTO" },
    },
  },

  PresignedUrlResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      data: {
        $ref: "#/components/schemas/PresignedUrlDTO",
      },
    },
  },

  PresignedUrlDTO: {
    type: "object",
    required: ["docType", "url", "key", "expiresIn"],
    properties: {
      docType: {
        type: "string",
        enum: ["aadharCard", "passportPhoto", "agreementPdf"],
        example: "aadharCard",
      },
      url: {
        type: "string",
        example: "https://rent-manager-vault.s3.ap-south-1.amazonaws.com/tenants/123/aadhar.pdf?X-Amz-Signature=...",
      },
      key: { type: "string", example: "tenants/6a81419007951455df97f003/aadharCard_1787560563905.pdf" },
      expiresIn: { type: "integer", example: 3600 },
    },
  },

  UserListResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      count: { type: "integer", example: 5 },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/UserDTO" },
      },
    },
  },

  TenantListResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      count: { type: "integer", example: 5 },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/TenantProfileDTO" },
      },
    },
  },

  PaymentRecordListResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      count: { type: "integer", example: 12 },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/PaymentRecordDTO" },
      },
    },
  },

  RentableUnitListResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      count: { type: "integer", example: 8 },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/DashboardUnitDTO" },
      },
    },
  },

  GenericSuccessResponse: {
    type: "object",
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Action completed successfully" },
      data: { type: "object" },
    },
  },

  ApiErrorResponse: {
    type: "object",
    required: ["success", "message"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Invalid input or resource not found" },
      errors: {
        type: "array",
        items: { type: "string" },
        example: ["tenantId is required"],
      },
    },
  },
});

