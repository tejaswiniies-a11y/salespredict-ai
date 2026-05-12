const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productCategory: {
      type: String,
      required: true,
      trim: true,
    },
    marketingSpend: {
      type: Number,
      required: true,
    },
    storeVisitors: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    seasonalityIndex: {
      type: Number,
      required: true,
    },
    predictedSales: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prediction", predictionSchema);
