import mongoose from "mongoose";

// Sub-schema for Specs (Matches 100% of mock fields)
const specsSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, trim: true },
    floorLevel: { type: String, required: true, trim: true },
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    kitchenType: { type: String, default: "None", trim: true },
    diningArea: { type: String, default: "None", trim: true },
    hasBalcony: { type: Boolean, default: false },
    roofAccess: { type: String, default: "None", trim: true },
    wasteManagement: { type: String, default: "", trim: true },
    sqft: { type: Number, required: true, min: 0 },
    furnishing: {
      type: String,
      enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"],
      default: "Unfurnished",
    },
    exitDoors: { type: Number, default: 1 },
    facingDirection: { type: String, default: "", trim: true },
    waterSource: { type: String, default: "", trim: true },
    electricityProvider: { type: String, default: "", trim: true },
    electricityRatePerUnit: { type: Number, default: 0 },
    meterType: { type: String, default: "", trim: true },
    parkingAvailable: { type: String, default: "None", trim: true },
    securityDeposit: { type: Number, required: true, min: 0 },
    noticePeriodMonths: { type: Number, default: 1 },
  },
  { _id: false },
);

// Sub-schema for Media Items
const galleryItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], default: "image" },
    url: { type: String, required: true, trim: true },
    caption: { type: String, default: "", trim: true },
  },
  { _id: false },
);

// Sub-schema for Snapshots
const snapshotsSchema = new mongoose.Schema(
  {
    coverImage: { type: String, default: "", trim: true },
    gallery: [galleryItemSchema],
    virtualTourUrl: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const rentableUnitSchema = new mongoose.Schema(
  {
    // String unit ID matching frontend (e.g., 'A-01', 'B-101', 'FLAT-101')
    unitCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Foreign Keys to parents
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
      required: true,
      index: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
      index: true,
    },

    // Basic Properties
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    rent: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["occupied", "vacant", "pending"],
      default: "vacant",
    },
    color: { type: String, default: "#94a3b8" },
    bio: { type: String, default: "", trim: true },

    // Embedded Detailed Data Objects
    specs: { type: specsSchema, required: true },
    snapshots: { type: snapshotsSchema, default: () => ({}) },

    // Foreign Key reference to active Tenant model (null if vacant)
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

export const RentableUnit = mongoose.model("RentableUnit", rentableUnitSchema);
