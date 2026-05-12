const fs = require("fs");
const csv = require("csv-parser");
const Prediction = require("../models/Prediction");
const DatasetUpload = require("../models/DatasetUpload");
const { predictSales, trainModel } = require("../services/mlService");
const { getProductCatalog, getProductCategories } = require("../services/productCatalogService");
const { validatePredictionPayload } = require("../services/predictionValidationService");
const COLUMN_ALIASES = {
  product: ["product", "product_name", "mobile_name", "item_name", "model", "name"],
  category: ["category", "brand", "product_category", "segment"],
  marketing_spend: ["marketing_spend", "marketing spend", "ad_spend", "advertising_spend", "promotion_spend"],
  store_visitors: ["store_visitors", "store visitors", "visitors", "footfall", "traffic"],
  discount: ["discount", "discount_percent", "discount_percentage", "discount_rate", "offer_discount"],
  seasonality_index: ["seasonality_index", "seasonality", "season_index", "seasonality factor"],
  price: ["price", "selling_price", "unit_price", "mrp", "sale_price"],
  quantity: ["quantity", "units_sold", "units", "qty", "orders", "order_quantity"],
  sales: ["sales", "revenue", "total_sales", "total_revenue", "amount", "turnover"],
};

const REQUIRED_DATASET_COLUMNS_MESSAGE = {
  sales: "sales/revenue/total_sales",
  price: "price/selling_price",
  quantity: "quantity/units_sold",
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "_");
}

function findHeaderKey(headerMap, aliases) {
  return aliases
    .map((alias) => normalizeHeader(alias))
    .find((alias) => headerMap.has(alias));
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildNormalizedRow(rawRow, headerMap, matched) {
  const getValue = (key) => {
    const matchedKey = matched[key];
    if (!matchedKey) return "";
    return rawRow[headerMap.get(matchedKey)] ?? "";
  };

  const marketingSpend = matched.marketing_spend
    ? toNumber(getValue("marketing_spend"))
    : toNumber(getValue("price"));
  const storeVisitors = matched.store_visitors
    ? toNumber(getValue("store_visitors"))
    : toNumber(getValue("quantity"));
  const discount = matched.discount ? toNumber(getValue("discount")) : 0;

  let seasonalityIndex = matched.seasonality_index ? toNumber(getValue("seasonality_index"), 1) : 1;
  if (!Number.isFinite(seasonalityIndex) || seasonalityIndex <= 0) {
    seasonalityIndex = 1;
  }

  let sales = matched.sales ? toNumber(getValue("sales")) : null;
  if (!Number.isFinite(sales) || sales <= 0) {
    sales = marketingSpend * Math.max(storeVisitors, 1);
  }

  return {
    marketing_spend: marketingSpend,
    store_visitors: storeVisitors,
    discount,
    seasonality_index: seasonalityIndex,
    sales,
  };
}

function normalizeDatasetCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let matchedHeaders = null;
    let headerMap = null;
    let validatedHeaders = false;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => {
        validatedHeaders = true;
        headerMap = new Map(headers.map((header) => [normalizeHeader(header), header]));
        matchedHeaders = {
          product: findHeaderKey(headerMap, COLUMN_ALIASES.product),
          category: findHeaderKey(headerMap, COLUMN_ALIASES.category),
          marketing_spend: findHeaderKey(headerMap, COLUMN_ALIASES.marketing_spend),
          store_visitors: findHeaderKey(headerMap, COLUMN_ALIASES.store_visitors),
          discount: findHeaderKey(headerMap, COLUMN_ALIASES.discount),
          seasonality_index: findHeaderKey(headerMap, COLUMN_ALIASES.seasonality_index),
          price: findHeaderKey(headerMap, COLUMN_ALIASES.price),
          quantity: findHeaderKey(headerMap, COLUMN_ALIASES.quantity),
          sales: findHeaderKey(headerMap, COLUMN_ALIASES.sales),
        };

        const missingColumns = [];
        if (!matchedHeaders.sales && !(matchedHeaders.price && matchedHeaders.quantity)) {
          missingColumns.push(REQUIRED_DATASET_COLUMNS_MESSAGE.sales);
        }
        if (!matchedHeaders.marketing_spend && !matchedHeaders.price) {
          missingColumns.push(REQUIRED_DATASET_COLUMNS_MESSAGE.price);
        }
        if (!matchedHeaders.store_visitors && !matchedHeaders.quantity) {
          missingColumns.push(REQUIRED_DATASET_COLUMNS_MESSAGE.quantity);
        }

        if (missingColumns.length) {
          reject(
            new Error(`Invalid CSV format. Missing required columns: ${missingColumns.join(", ")}.`)
          );
        }
      })
      .on("data", (row) => {
        if (matchedHeaders && headerMap) {
          rows.push(buildNormalizedRow(row, headerMap, matchedHeaders));
        }
      })
      .on("end", () => {
        if (!validatedHeaders) {
          return reject(
            new Error("Invalid CSV format. Missing required columns: sales/revenue/total_sales.")
          );
        }

        if (!rows.length) {
          return reject(new Error("Dataset is empty."));
        }

        const validRows = rows.filter(
          (row) =>
            Number.isFinite(row.marketing_spend) &&
            Number.isFinite(row.store_visitors) &&
            Number.isFinite(row.discount) &&
            Number.isFinite(row.seasonality_index) &&
            Number.isFinite(row.sales)
        );

        if (!validRows.length) {
          return reject(
            new Error("Invalid CSV format. Missing required columns: sales/revenue/total_sales.")
          );
        }

        const normalizedPath = filePath.replace(/\.csv$/i, "-normalized.csv");
        const normalizedCsv = [
          "marketing_spend,store_visitors,discount,seasonality_index,sales",
          ...validRows.map(
            (row) =>
              `${row.marketing_spend},${row.store_visitors},${row.discount},${row.seasonality_index},${row.sales}`
          ),
        ].join("\n");

        fs.writeFileSync(normalizedPath, normalizedCsv, "utf-8");

        return resolve({ rowCount: validRows.length, normalizedPath });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

exports.createPrediction = async (req, res) => {
  try {
    const payload = {
      productName: req.body.productName,
      productCategory: req.body.productCategory,
      marketingSpend: Number(req.body.marketingSpend),
      storeVisitors: Number(req.body.storeVisitors),
      discount: Number(req.body.discount),
      seasonalityIndex: Number(req.body.seasonalityIndex),
    };

    const validationResult = validatePredictionPayload(payload);
    if (!validationResult.valid) {
      return res.status(400).json({ success: false, message: validationResult.message });
    }

    const sanitizedPayload = validationResult.normalizedPayload;
    const mlResponse = await predictSales(sanitizedPayload);
    const prediction = await Prediction.create({
      user: req.user._id,
      ...sanitizedPayload,
      predictedSales: mlResponse.predicted_sales,
    });

    return res.status(201).json({
      success: true,
      message: "Prediction created successfully.",
      prediction,
      model: mlResponse.model,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPredictionCatalog = async (req, res) => {
  try {
    return res.json({
      success: true,
      products: getProductCatalog(),
      categories: getProductCategories(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, predictions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "CSV file is required." });
    }

    const { rowCount, normalizedPath } = await normalizeDatasetCsv(req.file.path);

    const datasetUpload = await DatasetUpload.create({
      user: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      rowCount,
    });

    const trainResponse = await trainModel(normalizedPath);

    return res.status(201).json({
      success: true,
      message: "Dataset uploaded and model trained successfully.",
      datasetUpload,
      trainResponse,
    });
  } catch (error) {
    const statusCode =
      error.message.startsWith("Invalid CSV format.") || error.message === "Dataset is empty."
        ? 400
        : 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};
