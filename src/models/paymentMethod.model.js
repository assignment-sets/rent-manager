import mongoose from "mongoose";
import { PAYMENT_METHOD_TYPES } from "../schemas/paymentMethod.schema.js";

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, uppercase: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
    branchName: { type: String, trim: true, default: "" },
    accountType: {
      type: String,
      enum: ["Savings", "Current"],
      default: "Savings",
    },
  },
  { _id: false },
);

const upiDetailsSchema = new mongoose.Schema(
  {
    upiId: { type: String, trim: true, lowercase: true, default: "" },
    payeeName: { type: String, trim: true, default: "" },
    phoneNumber: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const cashDetailsSchema = new mongoose.Schema(
  {
    collectorName: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    collectionAddress: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: PAYMENT_METHOD_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    instructions: {
      type: String,
      trim: true,
      default:
        "Please mention your Unit Code (e.g. A-01) in the payment remarks/notes.",
    },

    // Subdocuments
    bankDetails: {
      type: bankDetailsSchema,
      default: undefined,
    },
    upiDetails: {
      type: upiDetailsSchema,
      default: undefined,
    },
    cashDetails: {
      type: cashDetailsSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Virtual property to generate standard NPCI UPI URI dynamically
 * e.g. upi://pay?pa=gourab.m099@oksbi&pn=Gourab%20Mondal&cu=INR
 */
paymentMethodSchema.virtual("upiUri").get(function () {
  if ((this.type === "UPI" || this.type === "UPI_ID") && this.upiDetails?.upiId) {
    const pa = encodeURIComponent(this.upiDetails.upiId);
    const pn = encodeURIComponent(this.upiDetails.payeeName || "");
    return `upi://pay?pa=${pa}&pn=${pn}&cu=INR`;
  }
  return null;
});

export const PaymentMethod = mongoose.model(
  "PaymentMethod",
  paymentMethodSchema,
);
