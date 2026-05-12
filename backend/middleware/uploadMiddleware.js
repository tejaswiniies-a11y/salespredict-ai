const path = require("path");
const multer = require("multer");

function isProductionRuntime() {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
}

const storage = isProductionRuntime()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, "uploads/");
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    });

function fileFilter(req, file, cb) {
  const isCsv = path.extname(file.originalname).toLowerCase() === ".csv";
  if (!isCsv) {
    return cb(new Error("Only CSV files are allowed."));
  }
  return cb(null, true);
}

module.exports = multer({ storage, fileFilter });
