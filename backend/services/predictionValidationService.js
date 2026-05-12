const { findProduct } = require("./productCatalogService");

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s&-]{1,49}$/;

function validateTextField(value, fieldLabel) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return `${fieldLabel} is required.`;
  }

  if (normalized.length < 3) {
    return "Enter valid product details";
  }

  if (!NAME_PATTERN.test(normalized)) {
    return "Enter valid product details";
  }

  return null;
}

function validateNumberField(value, fieldLabel, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) {
    return `${fieldLabel} is required.`;
  }

  if (!Number.isFinite(value)) {
    return `${fieldLabel} must be a valid number.`;
  }

  if (value < min) {
    return `${fieldLabel} cannot be negative.`;
  }

  if (value > max) {
    return `${fieldLabel} is out of allowed range.`;
  }

  return null;
}

function validatePredictionPayload(payload) {
  const productNameError = validateTextField(payload.productName, "Product name");
  if (productNameError) {
    return { valid: false, message: "Enter valid product/category" };
  }

  const categoryError = validateTextField(payload.productCategory, "Product category");
  if (categoryError) {
    return { valid: false, message: "Enter valid product/category" };
  }

  const numericRules = [
    ["marketingSpend", "Marketing spend", { min: 0 }],
    ["storeVisitors", "Store visitors", { min: 0 }],
    ["discount", "Discount", { min: 0, max: 100 }],
    ["seasonalityIndex", "Seasonality index", { min: 0 }],
  ];

  for (const [field, label, rules] of numericRules) {
    const error = validateNumberField(payload[field], label, rules);
    if (error) {
      return { valid: false, message: error };
    }
  }

  const matchedProduct = findProduct(payload.productName, payload.productCategory);
  if (!matchedProduct) {
    return { valid: false, message: "Enter valid product/category" };
  }

  return {
    valid: true,
    normalizedPayload: {
      ...payload,
      productName: matchedProduct.productName,
      productCategory: matchedProduct.productCategory,
    },
  };
}

module.exports = {
  validatePredictionPayload,
};
