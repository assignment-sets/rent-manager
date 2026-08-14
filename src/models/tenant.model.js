import mongoose from "mongoose";

// Sub-schema for Emergency Contact
const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
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
      trim: true,
      default: "",
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
      required: true,
    },
    leaseEnd: {
      type: Date,
      required: true,
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
      required: true,
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
