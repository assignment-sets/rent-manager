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

    // Verification & Documentation
    isAgreementVerified: {
      type: Boolean,
      default: false,
    },
    documentsVaultUrl: {
      type: String,
      trim: true,
      default: "",
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
