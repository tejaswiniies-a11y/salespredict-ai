const Prediction = require("../models/Prediction");
const User = require("../models/User");
const DatasetUpload = require("../models/DatasetUpload");

exports.getAdminDashboard = async (req, res) => {
  try {
    const [userCount, adminCount, predictionCount, uploadCount, recentPredictions, users] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      Prediction.countDocuments(),
      DatasetUpload.countDocuments(),
      Prediction.find().populate("user", "name email").sort({ createdAt: -1 }).limit(8),
      User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(8),
    ]);

    const monthlyPredictions = await Prediction.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: 1 },
          avgSales: { $avg: "$predictedSales" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      success: true,
      stats: {
        userCount,
        adminCount,
        predictionCount,
        uploadCount,
      },
      recentPredictions,
      users,
      monthlyPredictions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
