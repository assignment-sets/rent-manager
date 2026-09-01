import mongoose from "mongoose";

const vacateNoticeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentableUnit",
      required: true,
      index: true,
    },
    unitCode: {
      type: String,
      required: true,
      trim: true,
    },
    initiatedBy: {
      type: String,
      enum: ["TENANT", "ADMIN"],
      required: true,
      index: true,
    },
    noticePeriodMonths: {
      type: Number,
      default: 1,
    },
    noticeDate: {
      type: Date,
      default: Date.now,
    },
    intendedVacateDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "NOTICE_SERVED", "COMPLETED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export const VacateNotice = mongoose.model("VacateNotice", vacateNoticeSchema);
