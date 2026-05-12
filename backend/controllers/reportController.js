const PDFDocument = require("pdfkit");
const Prediction = require("../models/Prediction");

function toCsv(predictions) {
  const headers = [
    "Product Name",
    "Product Category",
    "Marketing Spend",
    "Store Visitors",
    "Discount",
    "Seasonality Index",
    "Predicted Sales",
    "Created At",
  ];

  const rows = predictions.map((item) =>
    [
      item.productName,
      item.productCategory,
      item.marketingSpend,
      item.storeVisitors,
      item.discount,
      item.seasonalityIndex,
      item.predictedSales,
      new Date(item.createdAt).toISOString(),
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

exports.downloadCsvReport = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user._id }).sort({ createdAt: -1 });
    const csvContent = toCsv(predictions);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="prediction-history.csv"');
    return res.send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadPdfReport = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user._id }).sort({ createdAt: -1 });
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="prediction-history.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text("Sales Prediction Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`);
    doc.moveDown();

    predictions.forEach((item, index) => {
      doc
        .fontSize(12)
        .text(
          `${index + 1}. ${item.productName} (${item.productCategory}) | Predicted Sales: ${item.predictedSales} | Visitors: ${item.storeVisitors} | Spend: ${item.marketingSpend}`
        );
      doc.fontSize(10).text(`Discount: ${item.discount}% | Seasonality: ${item.seasonalityIndex}`);
      doc.fontSize(10).text(`Date: ${new Date(item.createdAt).toLocaleString()}`);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
