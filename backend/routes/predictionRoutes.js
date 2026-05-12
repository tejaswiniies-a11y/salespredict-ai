const express = require("express");
const predictionController = require("../controllers/predictionController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/catalog", protect, predictionController.getPredictionCatalog);
router.post("/", protect, predictionController.createPrediction);
router.get("/history", protect, predictionController.getMyPredictions);
router.post("/upload-csv", protect, upload.single("dataset"), predictionController.uploadDataset);

module.exports = router;
