import { z } from "zod";

export const PAYMENT_METHODS = [
  "UPI",
  "Bank Transfer",
  "Cash",
  "Cheque",
  "Other",
];

const monthFormatRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Record a Manual Payment Schema (Admin Action)
 */
export const recordPaymentSchema = z.object({
  tenantId: z
    .string({ required_error: "Tenant ID is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid tenant ID format"),
  amount: z
    .number({ required_error: "Payment amount is required" })
    .positive("Payment amount must be greater than 0"),
  monthsCovered: z
    .array(
      z
        .string()
        .regex(
          monthFormatRegex,
          "Each month must be in YYYY-MM format (e.g. 2026-08)",
        ),
    )
    .optional(),
  paymentMethod: z
    .enum(PAYMENT_METHODS, {
      message: `Invalid payment method. Allowed: ${PAYMENT_METHODS.join(", ")}`,
    })
    .default("UPI"),
  transactionReference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paidAt: z.string().datetime().optional(),
});

/**
 * Direct Quick Override for Tenant Rent Status (Admin Action)
 * Strictly allows 'Paid' and 'Pending'. 'Overdue' is a derived mathematical state.
 */
export const updateTenantRentStatusSchema = z.object({
  rentStatus: z.enum(["Paid", "Pending"], {
    message:
      "rentStatus must be 'Paid' or 'Pending'. 'Overdue' is a derived ledger state and cannot be manually overridden.",
  }),
  rentDueDate: z.string().trim().optional(),
});

