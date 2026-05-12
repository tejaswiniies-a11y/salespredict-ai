const fs = require("fs");
const path = require("path");

const catalogPath = path.join(__dirname, "..", "..", "data", "productCatalog.json");

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function readCatalog() {
  const content = fs.readFileSync(catalogPath, "utf-8");
  const parsed = JSON.parse(content);

  return parsed.map((item) => ({
    productName: String(item.productName || "").trim(),
    productCategory: String(item.productCategory || "").trim(),
    productNameKey: normalizeText(item.productName),
    productCategoryKey: normalizeText(item.productCategory),
  }));
}

function getProductCatalog() {
  return readCatalog().map(({ productName, productCategory }) => ({
    productName,
    productCategory,
  }));
}

function getProductCategories() {
  return [...new Set(readCatalog().map((item) => item.productCategory))].sort();
}

function findProduct(productName, productCategory) {
  const productNameKey = normalizeText(productName);
  const productCategoryKey = normalizeText(productCategory);

  return readCatalog().find(
    (item) => item.productNameKey === productNameKey && item.productCategoryKey === productCategoryKey
  );
}

module.exports = {
  findProduct,
  getProductCatalog,
  getProductCategories,
  normalizeText,
};
