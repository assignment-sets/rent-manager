import mongoose from "mongoose";

const floorSchema = new mongoose.Schema(
  {
    // Foreign key reference to the parent Plot
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plot",
      required: true,
      index: true,
    },
    // Numeric level index (e.g., 0 for Ground, 1 for 1st Floor)
    level: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

// Ensure level is unique per plot
floorSchema.index({ plotId: 1, level: 1 }, { unique: true });

export const Floor = mongoose.model("Floor", floorSchema);
