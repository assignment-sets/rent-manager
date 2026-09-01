import { z } from "zod";

/**
 * Standard 10-digit Indian Mobile Number Regex & Schema
 * Accepts formats:
 * - Pure 10 digits: "9876543210"
 * - With +91: "+919876543210", "+91 9876543210", "+91-9876543210"
 * - With 91 (no plus): "919876543210", "91 9876543210", "91-9876543210"
 * - With 0 (trunk prefix): "09876543210", "0 9876543210"
 * - With 0091: "00919876543210"
 */
export const INDIAN_PHONE_REGEX =
  /^(?:(?:\+|0{0,2})91[\s\-]?)?(?:0[\s\-]?)?[6-9]\d{9}$/;

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(
    INDIAN_PHONE_REGEX,
    "Invalid Indian phone number. Must be a valid 10-digit mobile number with optional +91/91/0 prefix.",
  );


/**
 * Standard 12-digit Indian Aadhar Number Schema
 * Accepts formats: "5412-8921-9812", "5412 8921 9812", "541289219812"
 */
export const aadharNumberSchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}[\-\s]?\d{4}[\-\s]?\d{4}$/,
    "Invalid Aadhar number. Must be a 12-digit Aadhar number (e.g. 5412-8921-9812).",
  );

/**
 * Broad Occupational Classification Enum
 */
export const OCCUPATION_VALUES = [
  "Private Sector",
  "Government Sector",
  "Business / Self-Employed",
  "Student",
  "Freelancer",
  "Retired",
  "Other",
];

export const occupationEnum = z.enum(OCCUPATION_VALUES, {
  message: `Invalid occupation. Allowed values: ${OCCUPATION_VALUES.join(", ")}`,
});

/**
 * Occupancy Type Enum
 */
export const OCCUPANCY_TYPES = [
  "Solo / Bachelor",
  "Couple",
  "Family",
  "Sharing",
];

export const occupancyTypeEnum = z.enum(OCCUPANCY_TYPES, {
  message: `Invalid occupancy type. Allowed values: ${OCCUPANCY_TYPES.join(", ")}`,
});

/**
 * Emergency Contact Relations Enum
 */
export const EMERGENCY_RELATION_VALUES = [
  "Father",
  "Mother",
  "Spouse / Partner",
  "Sibling",
  "Guardian",
  "Friend / Colleague",
  "Relative",
  "Other",
];

export const emergencyRelationEnum = z.enum(EMERGENCY_RELATION_VALUES, {
  message: `Invalid relation. Allowed values: ${EMERGENCY_RELATION_VALUES.join(", ")}`,
});

/**
 * Emergency Contact Schema
 */
export const emergencyContactSchema = z
  .object({
    name: z.string().trim().default(""),
    relation: z
      .string()
      .trim()
      .refine(
        (val) => val === "" || EMERGENCY_RELATION_VALUES.includes(val),
        {
          message: `Invalid emergency contact relation. Allowed values: ${EMERGENCY_RELATION_VALUES.join(", ")}`,
        },
      )
      .default(""),
    phone: z
      .string()
      .trim()
      .refine(
        (val) => val === "" || INDIAN_PHONE_REGEX.test(val),
        {
          message:
            "Invalid emergency contact phone number. Must be a valid 10-digit mobile number with optional +91/91/0 prefix.",
        },
      )
      .default(""),
  })
  .optional()
  .default(() => ({ name: "", relation: "", phone: "" }));

/**
 * Complete Tenant Onboarding Payload Schema
 */
export const tenantOnboardSchema = z
  .object({
    phone: indianPhoneSchema.optional(),
    aadharNumber: aadharNumberSchema,
    permanentAddress: z
      .string()
      .trim()
      .min(5, "Permanent address must be at least 5 characters long"),
    occupation: occupationEnum,
    occupancyType: occupancyTypeEnum.optional().default("Solo / Bachelor"),
    occupantsCount: z.coerce
      .number()
      .int("Occupants count must be an integer")
      .min(1, "Occupants count must be at least 1")
      .optional()
      .default(1),
    whatsappPhone: indianPhoneSchema.optional(),
    moveInDate: z.string().or(z.date()).optional(),
    leaseEnd: z.string().or(z.date()).optional(),
    rentDueDate: z.string().trim().optional(),
    emergencyContact: emergencyContactSchema,
  })
  .superRefine((data, ctx) => {
    const { occupancyType, occupantsCount } = data;

    if (occupancyType === "Solo / Bachelor" && occupantsCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occupantsCount"],
        message:
          "Occupancy type 'Solo / Bachelor' must have exactly 1 occupant.",
      });
    }

    if (occupancyType === "Couple" && occupantsCount !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occupantsCount"],
        message: "Occupancy type 'Couple' must have exactly 2 occupants.",
      });
    }

    if (occupancyType === "Family" && (occupantsCount < 2 || occupantsCount > 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occupantsCount"],
        message: "Occupancy type 'Family' must have between 2 and 10 occupants.",
      });
    }

    if (occupancyType === "Sharing" && (occupantsCount < 2 || occupantsCount > 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occupantsCount"],
        message: "Occupancy type 'Sharing' must have between 2 and 8 occupants.",
      });
    }
  });

/**
 * Phase 2 Mandatory Emergency Contact Schema
 */
export const mandatoryEmergencyContactSchema = z.object({
  name: z.string().trim().min(2, "Emergency contact name is required (min 2 characters)"),
  relation: emergencyRelationEnum,
  phone: indianPhoneSchema,
});

/**
 * Phase 2 Form Text Fields Schema (Parsed alongside multipart files)
 */
export const submitAgreementDocsSchema = z.object({
  emergencyContactName: z
    .string()
    .trim()
    .min(2, "Emergency contact name is required"),
  emergencyContactRelation: emergencyRelationEnum,
  emergencyContactPhone: indianPhoneSchema,
  whatsappPhone: indianPhoneSchema.optional(),
  permanentAddress: z
    .string()
    .trim()
    .min(5, "Permanent address must be at least 5 characters long")
    .optional(),
});

/**
 * Agreement Status Enum Values
 */
export const AGREEMENT_STATUS_VALUES = [
  "NOT_SUBMITTED",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
  "FAILED",
];

export const agreementStatusEnum = z.enum(AGREEMENT_STATUS_VALUES, {
  message: `Invalid agreement status. Allowed values: ${AGREEMENT_STATUS_VALUES.join(", ")}`,
});

/**
 * Admin Agreement Status Update Schema
 */
export const updateAgreementStatusSchema = z.object({
  agreementStatus: agreementStatusEnum.optional(),
  isAgreementVerified: z
    .union([z.boolean(), z.string().transform((v) => v === "true")])
    .optional(),
  agreementPdfUrl: z.string().trim().optional(),
  rejectionReason: z.string().trim().optional(),
  deleteAgreementPdf: z
    .union([z.boolean(), z.string().transform((v) => v === "true")])
    .optional(),
  clearAgreementPdf: z
    .union([z.boolean(), z.string().transform((v) => v === "true")])
    .optional(),
});



