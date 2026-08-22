import { z } from "zod";
import { indianPhoneSchema } from "./tenant.schema.js";

/**
 * Standard Indian IFSC Code Regex (11 characters: 4 letters + '0' + 6 alphanumeric)
 * e.g., HDFC0001234, SBIN0000456
 */
export const ifscCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{4}0[A-Z0-9]{6}$/,
    "Invalid Indian IFSC code. Must be 11 characters (e.g. HDFC0001234).",
  );

/**
 * Standard UPI VPA Regex (Virtual Payment Address)
 * e.g., user@okhdfcbank, 9876543210@paytm, landlord@sbi
 */
export const upiVpaSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[\w.\-_]+@[\w.\-_]+$/,
    "Invalid UPI ID format. Expected format: username@bank (e.g. rent@okhdfcbank).",
  );

/**
 * Supported Payment Method Types
 */
export const PAYMENT_METHOD_TYPES = [
  "BANK_TRANSFER",
  "UPI",
  "UPI_ID", // Backward-compatible alias for UPI
  "CASH",
];

export const paymentMethodTypeEnum = z.enum(PAYMENT_METHOD_TYPES, {
  message: `Invalid payment method type. Allowed values: BANK_TRANSFER, UPI, CASH`,
});

/**
 * Bank Details Schema
 */
export const bankDetailsSchema = z.object({
  accountHolderName: z
    .string()
    .trim()
    .min(2, "Account holder name is required"),
  accountNumber: z
    .string()
    .trim()
    .min(5, "Valid bank account number is required"),
  ifscCode: ifscCodeSchema,
  bankName: z.string().trim().min(2, "Bank name is required"),
  branchName: z.string().trim().optional().default(""),
  accountType: z
    .enum(["Savings", "Current"], {
      message: "Account type must be 'Savings' or 'Current'",
    })
    .optional()
    .default("Savings"),
});

/**
 * UPI Details Schema (Used for both copyable UPI ID and dynamic QR generation)
 */
export const upiDetailsSchema = z.object({
  upiId: upiVpaSchema,
  payeeName: z.string().trim().min(2, "Payee name is required"),
  phoneNumber: indianPhoneSchema.optional(),
});

/**
 * Cash Payment Details Schema
 */
export const cashDetailsSchema = z.object({
  collectorName: z.string().trim().min(2, "Collector name is required"),
  contactPhone: indianPhoneSchema.optional(),
  collectionAddress: z.string().trim().optional().default(""),
});

/**
 * Create Payment Method Schema
 */
export const createPaymentMethodSchema = z
  .object({
    type: paymentMethodTypeEnum,
    title: z
      .string()
      .trim()
      .min(2, "Title is required (e.g. 'HDFC Primary Account', 'GPay UPI')"),
    subtitle: z.string().trim().optional().default(""),
    isPrimary: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    displayOrder: z.coerce.number().int().optional().default(0),
    instructions: z
      .string()
      .trim()
      .optional()
      .default(
        "Please mention your Unit Code (e.g. A-01) in the payment remarks/notes.",
      ),
    bankDetails: bankDetailsSchema.optional(),
    upiDetails: upiDetailsSchema.optional(),
    cashDetails: cashDetailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "BANK_TRANSFER" && !data.bankDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bankDetails"],
        message: "bankDetails object is required for BANK_TRANSFER payment type.",
      });
    }

    if ((data.type === "UPI" || data.type === "UPI_ID") && !data.upiDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upiDetails"],
        message: "upiDetails object is required for UPI payment type.",
      });
    }

    if (data.type === "CASH" && !data.cashDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cashDetails"],
        message: "cashDetails object is required for CASH payment type.",
      });
    }
  });

/**
 * Update Payment Method Schema
 */
export const updatePaymentMethodSchema = z.object({
  title: z.string().trim().min(2).optional(),
  subtitle: z.string().trim().optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
  instructions: z.string().trim().optional(),
  bankDetails: bankDetailsSchema.partial().optional(),
  upiDetails: upiDetailsSchema.partial().optional(),
  cashDetails: cashDetailsSchema.partial().optional(),
});
