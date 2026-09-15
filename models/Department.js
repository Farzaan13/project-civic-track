const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      // e.g. "Roads & Infrastructure", "Sanitation", "Water Supply", "Electricity"
    },
    categories: [
      {
        type: String,
        // categories this department handles, e.g. ["pothole","road_damage"]
      },
    ],
    slaHours: {
      type: Number,
      default: 72, // default 3 days to resolve
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
