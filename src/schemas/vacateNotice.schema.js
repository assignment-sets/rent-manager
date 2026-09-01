import { z } from "zod";

/**
 * Tenant Move-Out Notice Submission Schema
 */
export const createTenantVacateNoticeSchema = z.object({
  intendedVacateDate: z
    .string({
      required_error: "Intended vacate date is required",
    })
    .datetime({
      message: "intendedVacateDate must be a valid ISO 8601 date string",
    })
    .optional(),
  reason: z.string().trim().optional(),
});

/**
 * Admin Serve Move-Out Notice Schema
 * intendedVacateDate is optional; if omitted, automatically computed from unit's predetermined noticePeriodMonths
 */
export const serveAdminVacateNoticeSchema = z.object({
  intendedVacateDate: z
    .string()
    .datetime({
      message: "intendedVacateDate must be a valid ISO 8601 date string",
    })
    .optional(),
  reason: z.string().trim().optional(),
  adminNotes: z.string().trim().optional(),
});

/**
 * Admin Review Notice Schema
 */
export const reviewVacateNoticeSchema = z.object({
  action: z.enum(["APPROVE_AND_VACATE", "REJECT"], {
    message: "action must be either 'APPROVE_AND_VACATE' or 'REJECT'",
  }),
  adminNotes: z.string().trim().optional(),
});

/**
 * Vacate Rentable Unit Direct Request Schema
 */
export const vacateUnitSchema = z.object({
  vacateReason: z.string().trim().optional(),
});
