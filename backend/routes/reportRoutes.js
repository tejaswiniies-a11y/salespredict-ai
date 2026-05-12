const express = require("express");
const reportController = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/csv", protect, reportController.downloadCsvReport);
router.get("/pdf", protect, reportController.downloadPdfReport);

module.exports = router;
