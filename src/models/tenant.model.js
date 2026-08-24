import mongoose from "mongoose";
import { OCCUPATION_VALUES } from "../schemas/tenant.schema.js";

// Sub-schema for Emergency Contact
const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    relation: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
  },
  { _id: false },
);

// Sub-schema for individual document items
const documentItemSchema = new mongoose.Schema(
  {
    url: { type: String, default: "", trim: true },
    key: { type: String, default: "", trim: true }, // S3 object key
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Sub-schema for optional additional documents (e.g. PAN card, company ID)
const additionalDocSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    key: { type: String, default: "", trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Sub-schema for all Tenant documents
const tenantDocumentsSchema = new mongoose.Schema(
  {
    aadharCard: {
      type: documentItemSchema,
      default: () => ({ url: "", key: "" }),
    },
    passportPhoto: {
      type: documentItemSchema,
      default: () => ({ url: "", key: "" }),
    },
    agreementPdf: {
      type: documentItemSchema,
      default: () => ({ url: "", key: "" }),
    },
    additionalDocs: {
      type: [additionalDocSchema],
      default: [],
    },
  },
  { _id: false },
);

export const AGREEMENT_STATUSES = [
  "NOT_SUBMITTED", // Default upon initial onboarding (Phase 1)
  "SUBMITTED",     // Phase 2 completed; documents under review
  "VERIFIED",      // Admin signed off and attached Agreement PDF
  "REJECTED",      // Admin rejected submission with rejectionReason
  "FAILED",        // System/Storage failure during processing
];

const tenantSchema = new mongoose.Schema(
  {
    // Link to core User auth account (1-to-1 relationship)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Guarantees a user can only have 1 active tenant profile
      index: true,
    },

    // Identity & Legal Information
    whatsappPhone: {
      type: String,
      trim: true,
      default: "",
    },
    aadharNumber: {
      type: String,
      required: [true, "Aadhar number is required"],
      trim: true,
      default: "",
    },
    permanentAddress: {
      type: String,
      required: [true, "Permanent address is required"],
      trim: true,
    },
    occupation: {
      type: String,
      enum: OCCUPATION_VALUES,
      required: [true, "Occupation is required"],
      trim: true,
      default: "Other",
    },

    // Occupancy Details
    occupancyType: {
      type: String,
      enum: ["Solo / Bachelor", "Couple", "Family", "Sharing"],
      default: "Solo / Bachelor",
    },
    occupantsCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Lease & Financial Information
    moveInDate: {
      type: Date,
      default: Date.now,
    },
    leaseEnd: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 11);
        return d;
      },
    },
    rentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Overdue"],
      default: "Pending",
    },
    rentDueDate: {
      type: String,
      default: "5th of every month",
    },

    // Verification & Documentation Lifecycle
    agreementStatus: {
      type: String,
      enum: AGREEMENT_STATUSES,
      default: "NOT_SUBMITTED",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    isAgreementVerified: {
      type: Boolean,
      default: false,
    },
    documents: {
      type: tenantDocumentsSchema,
      default: () => ({}),
    },

    // Emergency Contact Subdocument
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({ name: "", relation: "", phone: "" }),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual property to calculate dynamic days occupied on the fly
tenantSchema.virtual("daysOccupied").get(function () {
  if (!this.moveInDate) return 0;
  const diffTime = Math.abs(new Date() - new Date(this.moveInDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export const Tenant = mongoose.model("Tenant", tenantSchema);
