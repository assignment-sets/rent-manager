import mongoose from "mongoose";

const paymentRecordSchema = new mongoose.Schema(
  {
    // Associated Tenant Profile
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // Associated User Auth Account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Rentable Unit rented by tenant
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentableUnit",
      required: true,
      index: true,
    },

    // Total payment amount in INR
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Amount must be at least ₹1"],
    },

    // Months covered by this payment, stored as normalized "YYYY-MM" (e.g. ["2026-06", "2026-07"])
    monthsCovered: {
      type: [String],
      required: true,
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        "At least one covered month (YYYY-MM) is required",
      ],
      index: true,
    },

    // Payment Method / Instrument
    paymentMethod: {
      type: String,
      enum: ["UPI", "Bank Transfer", "Cash", "Cheque", "Other"],
      default: "UPI",
    },

    // Transaction Reference (UPI UTR, IMPS Ref, or Cash Receipt No.)
    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },

    // Internal Admin Notes
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Date when payment was actually received offline
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Admin who recorded and verified this payment
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const PaymentRecord = mongoose.model(
  "PaymentRecord",
  paymentRecordSchema,
);
