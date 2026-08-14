import mongoose from "mongoose";

const gridPosSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);

const plotSchema = new mongoose.Schema(
  {
    // Unique identifier string matching frontend mock (e.g., 'plot-a', 'plot-b', 'flat-apt')
    plotId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    // 2D grid coordinates for visual dashboard rendering
    gridPos: {
      type: gridPosSchema,
      required: true,
    },
  },
  { timestamps: true },
);

export const Plot = mongoose.model("Plot", plotSchema);
