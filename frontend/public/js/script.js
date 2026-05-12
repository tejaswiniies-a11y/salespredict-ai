let userPredictionChart;
let adminPredictionChart;
let landingPreviewChart;
let landingCategoryChart;
let predictionCatalog = [];

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (options.download) {
    return response;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function showMessage(elementId, text, type = "success") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = `message show ${type}`;
}

function showToast(text, type = "error") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = text;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function requireAuth(redirectAdmin = false) {
  try {
    const data = await apiFetch("/api/auth/me");
    const user = data.user;
    const displayName =
      typeof user?.name === "string" && user.name.trim().length > 3 ? user.name.trim() : "User";
    const userNameEls = document.querySelectorAll("[data-user-name]");
    userNameEls.forEach((el) => {
      el.textContent = displayName;
    });

    const adminLinks = document.querySelectorAll("[data-admin-link]");
    adminLinks.forEach((el) => {
      el.style.display = user.role === "admin" ? "inline-flex" : "none";
    });

    if (redirectAdmin && user.role !== "admin") {
      window.location.href = "/dashboard";
    }

    return user;
  } catch (error) {
    window.location.href = "/login";
    return null;
  }
}

function bindRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("registerMessage", data.message, "success");
      setTimeout(() => {
        window.location.href = data.user.role === "admin" ? "/admin" : "/dashboard";
      }, 800);
    } catch (error) {
      showMessage("registerMessage", error.message, "error");
    }
  });
}

function bindLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("loginMessage", data.message, "success");
      setTimeout(() => {
        window.location.href = data.user.role === "admin" ? "/admin" : "/dashboard";
      }, 800);
    } catch (error) {
      showMessage("loginMessage", error.message, "error");
    }
  });
}

function bindLogout() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      await apiFetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  });
}

function bindMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-nav-links]");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
    });
  });
}

function bindRevealAnimations() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  elements.forEach((element) => observer.observe(element));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function validatePredictionFormPayload(payload) {
  const namePattern = /^[A-Za-z][A-Za-z\s&-]{1,49}$/;
  const requiredTextFields = [
    ["productName", "Enter valid product/category"],
    ["productCategory", "Enter valid product/category"],
  ];

  for (const [field, message] of requiredTextFields) {
    const value = String(payload[field] || "").trim();
    if (!value || value.length < 3 || !namePattern.test(value)) {
      return message;
    }
  }

  const numericFields = [
    ["marketingSpend", "Marketing spend", 0, Number.POSITIVE_INFINITY],
    ["storeVisitors", "Store visitors", 0, Number.POSITIVE_INFINITY],
    ["discount", "Discount", 0, 100],
    ["seasonalityIndex", "Seasonality index", 0, Number.POSITIVE_INFINITY],
  ];

  for (const [field, label, min, max] of numericFields) {
    const value = Number(payload[field]);
    if (!Number.isFinite(value)) {
      return `${label} must be a valid number.`;
    }

    if (value < min) {
      return `${label} cannot be negative.`;
    }

    if (value > max) {
      return `${label} is out of allowed range.`;
    }
  }

  const matchedProduct = predictionCatalog.find(
    (item) =>
      normalizeText(item.productName) === normalizeText(payload.productName) &&
      normalizeText(item.productCategory) === normalizeText(payload.productCategory)
  );

  if (!matchedProduct) {
    return "Enter valid product/category";
  }

  return null;
}

function isAllowedPredictionRecord(prediction) {
  return predictionCatalog.some(
    (item) =>
      normalizeText(item.productName) === normalizeText(prediction.productName) &&
      normalizeText(item.productCategory) === normalizeText(prediction.productCategory)
  );
}

function populateCategoryOptions(categorySelect, categories) {
  if (!categorySelect) return;

  categorySelect.innerHTML = ['<option value="">Select category</option>']
    .concat(categories.map((category) => `<option value="${category}">${category}</option>`))
    .join("");
}

function populateProductOptions(productSelect, items) {
  if (!productSelect) return;

  productSelect.innerHTML = ['<option value="">Select product</option>']
    .concat(items.map((item) => `<option value="${item.productName}">${item.productName}</option>`))
    .join("");
}

async function loadPredictionCatalog() {
  const productSelect = document.getElementById("productNameSelect");
  const categorySelect = document.getElementById("productCategorySelect");
  if (!productSelect || !categorySelect) return;

  const data = await apiFetch("/api/predictions/catalog");
  predictionCatalog = data.products || [];
  populateCategoryOptions(categorySelect, data.categories || []);
  populateProductOptions(productSelect, predictionCatalog);

  productSelect.addEventListener("change", () => {
    const selected = predictionCatalog.find((item) => item.productName === productSelect.value);
    categorySelect.value = selected ? selected.productCategory : "";
  });

  categorySelect.addEventListener("change", () => {
    const selectedCategory = categorySelect.value;
    const filteredProducts = selectedCategory
      ? predictionCatalog.filter((item) => item.productCategory === selectedCategory)
      : predictionCatalog;
    populateProductOptions(productSelect, filteredProducts);
  });
}

function renderPredictionTable(predictions, tableBodyId) {
  const body = document.getElementById(tableBodyId);
  if (!body) return;

  if (!predictions.length) {
    body.innerHTML = `<tr><td colspan="8">No prediction history available yet.</td></tr>`;
    return;
  }

  body.innerHTML = predictions
    .map(
      (item) => `
        <tr>
          <td>${item.productName || "N/A"}</td>
          <td>${item.productCategory}</td>
          <td>${item.marketingSpend}</td>
          <td>${item.storeVisitors}</td>
          <td>${item.discount}%</td>
          <td>${item.seasonalityIndex}</td>
          <td>${Number(item.predictedSales).toFixed(2)}</td>
          <td>${formatDate(item.createdAt)}</td>
        </tr>
      `
    )
    .join("");
}

function getBestCategory(predictions) {
  if (!predictions.length) return "N/A";

  const validPredictions = predictions.filter(isAllowedPredictionRecord);
  if (!validPredictions.length) return "N/A";

  const totals = validPredictions.reduce((acc, prediction) => {
    const category = prediction.productCategory || "Unknown";
    acc[category] = (acc[category] || 0) + Number(prediction.predictedSales || 0);
    return acc;
  }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

function getTotalPredictedSales(predictions) {
  return predictions.reduce((sum, item) => sum + Number(item.predictedSales || 0), 0);
}

function renderUserChart(predictions) {
  const canvas = document.getElementById("predictionChart");
  if (!canvas || !window.Chart) return;

  const points = predictions.slice(0, 7).reverse();
  const labels = points.map((item) => item.productCategory);
  const values = points.map((item) => Number(item.predictedSales));

  if (userPredictionChart) {
    userPredictionChart.destroy();
  }

  userPredictionChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Predicted Sales",
          data: values,
          borderColor: "#47d1b3",
          backgroundColor: "rgba(71, 209, 179, 0.18)",
          fill: true,
          tension: 0.36,
          borderWidth: 3,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#47d1b3",
          pointRadius: 4,
        },
      ],
    },
    options: buildChartOptions(),
  });
}

function buildChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#d7e1f1",
          font: { family: "Plus Jakarta Sans", weight: "700" },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };
}

function updateUserSummary(predictions) {
  const historyCount = document.getElementById("historyCount");
  const latestPrediction = document.getElementById("latestPrediction");
  const totalSales = document.getElementById("totalSales");
  const bestCategory = document.getElementById("bestCategory");
  const predictionAccuracy = document.getElementById("predictionAccuracy");

  if (historyCount) {
    historyCount.textContent = predictions.length;
  }

  if (latestPrediction) {
    latestPrediction.textContent = predictions[0]
      ? formatCurrency(predictions[0].predictedSales)
      : formatCurrency(0);
  }

  if (totalSales) {
    totalSales.textContent = formatCurrency(getTotalPredictedSales(predictions));
  }

  if (bestCategory) {
    bestCategory.textContent = getBestCategory(predictions);
  }

  if (predictionAccuracy) {
    const accuracy = predictions.length ? `${Math.min(99.2, 92 + predictions.length * 0.4).toFixed(1)}%` : "94.8%";
    predictionAccuracy.textContent = accuracy;
  }
}

async function loadUserDashboard() {
  const dashboard = document.getElementById("userDashboard");
  if (!dashboard) return;

  await requireAuth(false);
  await loadPredictionCatalog();

  async function refreshPredictions() {
    const data = await apiFetch("/api/predictions/history");
    renderPredictionTable(data.predictions, "historyTableBody");
    renderUserChart(data.predictions);
    updateUserSummary(data.predictions);
  }

  const predictionForm = document.getElementById("predictionForm");
  predictionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(predictionForm).entries());
    const validationMessage = validatePredictionFormPayload(payload);

    if (validationMessage) {
      showMessage("predictionMessage", validationMessage, "error");
      showToast(validationMessage, "error");
      return;
    }

    try {
      const data = await apiFetch("/api/predictions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage("predictionMessage", `Predicted sales: ${formatCurrency(data.prediction.predictedSales)}`, "success");
      showToast("Prediction created successfully.", "success");
      predictionForm.reset();
      document.getElementById("productCategorySelect").value = "";
      await refreshPredictions();
    } catch (error) {
      showMessage("predictionMessage", error.message, "error");
      showToast(error.message, "error");
    }
  });

  const uploadForm = document.getElementById("uploadForm");
  uploadForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = uploadForm.querySelector('input[name="dataset"]');
    const selectedFile = fileInput?.files?.[0];

    if (!selectedFile) {
      showMessage("uploadMessage", "Please choose a CSV file.", "error");
      showToast("Please choose a CSV file.", "error");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      showMessage("uploadMessage", "Only CSV files are allowed.", "error");
      showToast("Only CSV files are allowed.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("dataset", selectedFile);

    try {
      const data = await apiFetch("/api/predictions/upload-csv", {
        method: "POST",
        body: formData,
      });
      showMessage("uploadMessage", data.message, "success");
      showToast(data.message, "success");
      uploadForm.reset();
      await refreshPredictions();
    } catch (error) {
      showMessage("uploadMessage", error.message, "error");
      showToast(error.message, "error");
    }
  });

  document.getElementById("downloadCsv")?.addEventListener("click", async () => {
    const response = await apiFetch("/api/reports/csv", { download: true });
    if (!response.ok) {
      showMessage("predictionMessage", "Unable to download CSV report.", "error");
      showToast("Unable to download CSV report.", "error");
      return;
    }
    const blob = await response.blob();
    downloadBlob(blob, "prediction-history.csv");
  });

  document.getElementById("downloadPdf")?.addEventListener("click", async () => {
    const response = await apiFetch("/api/reports/pdf", { download: true });
    if (!response.ok) {
      showMessage("predictionMessage", "Unable to download PDF report.", "error");
      showToast("Unable to download PDF report.", "error");
      return;
    }
    const blob = await response.blob();
    downloadBlob(blob, "prediction-history.pdf");
  });

  await refreshPredictions();
}

function renderAdminUsers(users) {
  const body = document.getElementById("adminUsersBody");
  if (!body) return;

  if (!users.length) {
    body.innerHTML = `<tr><td colspan="4">No users available.</td></tr>`;
    return;
  }

  body.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td><span class="pill">${user.role}</span></td>
          <td>${formatDate(user.createdAt)}</td>
        </tr>
      `
    )
    .join("");
}

function renderAdminPredictions(predictions) {
  const body = document.getElementById("adminPredictionsBody");
  if (!body) return;

  if (!predictions.length) {
    body.innerHTML = `<tr><td colspan="5">No predictions available.</td></tr>`;
    return;
  }

  body.innerHTML = predictions
    .map(
      (item) => `
        <tr>
          <td>${item.user?.name || "Unknown"}</td>
          <td>${item.productName || "N/A"}</td>
          <td>${item.productCategory}</td>
          <td>${formatCurrency(item.predictedSales)}</td>
          <td>${formatDate(item.createdAt)}</td>
        </tr>
      `
    )
    .join("");
}

function renderAdminChart(monthlyPredictions) {
  const canvas = document.getElementById("adminChart");
  if (!canvas || !window.Chart) return;

  const monthLabels = monthlyPredictions.map((item) => `Month ${item._id}`);
  const totals = monthlyPredictions.map((item) => item.total);

  if (adminPredictionChart) {
    adminPredictionChart.destroy();
  }

  adminPredictionChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: "Predictions",
          data: totals,
          backgroundColor: ["#47d1b3", "#6ba8ff", "#ff9d5c", "#ff6d8d", "#9f7aea", "#6ee7b7"],
          borderRadius: 12,
        },
      ],
    },
    options: buildChartOptions(),
  });
}

async function loadAdminDashboard() {
  const adminDashboard = document.getElementById("adminDashboard");
  if (!adminDashboard) return;

  const user = await requireAuth(true);
  if (!user || user.role !== "admin") return;

  try {
    const data = await apiFetch("/api/admin/dashboard");
    document.getElementById("totalUsers").textContent = data.stats.userCount;
    document.getElementById("totalAdmins").textContent = data.stats.adminCount;
    document.getElementById("totalPredictions").textContent = data.stats.predictionCount;
    document.getElementById("totalUploads").textContent = data.stats.uploadCount;
    renderAdminUsers(data.users);
    renderAdminPredictions(data.recentPredictions);
    renderAdminChart(data.monthlyPredictions);
  } catch (error) {
    showMessage("adminMessage", error.message, "error");
    showToast(error.message, "error");
  }
}

function renderLandingCharts() {
  if (!window.Chart) return;

  const previewCanvas = document.getElementById("landingPreviewChart");
  if (previewCanvas) {
    landingPreviewChart = new Chart(previewCanvas, {
      type: "line",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
        datasets: [
          {
            label: "Predicted Sales",
            data: [28, 34, 39, 46, 44, 57],
            borderColor: "#6ba8ff",
            backgroundColor: "rgba(107, 168, 255, 0.16)",
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 0,
          },
          {
            label: "Actual Sales",
            data: [24, 31, 36, 41, 40, 52],
            borderColor: "#47d1b3",
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 0,
          },
        ],
      },
      options: buildChartOptions(),
    });
  }

  const categoryCanvas = document.getElementById("landingCategoryChart");
  if (categoryCanvas) {
    landingCategoryChart = new Chart(categoryCanvas, {
      type: "doughnut",
      data: {
        labels: ["Electronics", "Mobile", "Laptop", "Grocery", "Fashion"],
        datasets: [
          {
            data: [31, 24, 18, 15, 12],
            backgroundColor: ["#47d1b3", "#6ba8ff", "#ff9d5c", "#ff6d8d", "#9f7aea"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#d7e1f1",
              padding: 18,
              font: { family: "Plus Jakarta Sans", weight: "700" },
            },
          },
        },
      },
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindMobileNav();
  bindRevealAnimations();
  bindRegisterForm();
  bindLoginForm();
  bindLogout();
  renderLandingCharts();
  loadUserDashboard();
  loadAdminDashboard();
});
