const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const modelPath = path.join(projectRoot, "model.json");

function isProductionRuntime() {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
}

function parsePythonOutput(output) {
  const trimmed = String(output || "").trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
}

function runPythonWithCommand(command, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(projectRoot, "train_model.py");
    const child = spawn(command, [scriptPath, ...args], {
      cwd: projectRoot,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const parsedStdout = parsePythonOutput(stdout);

      if (code !== 0) {
        const pythonMessage =
          parsedStdout?.message || stderr.trim() || stdout.trim() || "Python process failed.";
        console.error(`[ML] Python command "${command}" failed.`);
        if (stderr.trim()) {
          console.error("[ML] stderr:", stderr.trim());
        }
        if (stdout.trim()) {
          console.error("[ML] stdout:", stdout.trim());
        }
        return reject(new Error(pythonMessage));
      }

      if (parsedStdout) {
        return resolve(parsedStdout);
      }

      return reject(new Error(`Invalid ML response: ${stdout}`));
    });
  });
}

function isPythonUnavailableError(error) {
  return error?.code === "ENOENT" || /spawn\s+\S+\s+ENOENT/i.test(error?.message || "");
}

function getPythonCommands() {
  const commands = [];

  if (process.env.PYTHON_PATH) {
    commands.push(process.env.PYTHON_PATH);
  }

  if (process.platform === "win32") {
    commands.push("python", "py");
  } else {
    commands.push("python3", "python");
  }

  return [...new Set(commands)];
}

async function runPython(args) {
  const resolvedArgs = args.map((arg, index) => {
    if (index === 1 && args[0] === "train") {
      return path.resolve(projectRoot, String(arg));
    }

    return String(arg);
  });

  let lastError;
  for (const command of getPythonCommands()) {
    try {
      return await runPythonWithCommand(command, resolvedArgs);
    } catch (error) {
      lastError = error;
      if (!isPythonUnavailableError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Python was not found. Install Python or configure PYTHON_PATH.');
}

function predictSalesFromSavedModel(payload) {
  if (!fs.existsSync(modelPath)) {
    throw new Error("Saved model not found.");
  }

  const model = JSON.parse(fs.readFileSync(modelPath, "utf-8"));
  const values = {
    marketing_spend: Number(payload.marketingSpend),
    store_visitors: Number(payload.storeVisitors),
    discount: Number(payload.discount),
    seasonality_index: Number(payload.seasonalityIndex),
  };

  let prediction = Number(model.baseline_component || 0);

  for (const [featureName, value] of Object.entries(values)) {
    const featureModel = model.features?.[featureName];
    const weight = model.weights?.[featureName];

    if (!featureModel || typeof weight !== "number") {
      continue;
    }

    const component = Number(featureModel.slope || 0) * value + Number(featureModel.intercept || 0);
    prediction += weight * component;
  }

  return {
    success: true,
    predicted_sales: Math.max(0, Number(prediction.toFixed(2))),
    model: {
      trained_on: model.trained_on,
      source: model.source || "model.json",
      fallback: true,
    },
  };
}

async function predictSales(payload) {
  if (isProductionRuntime()) {
    return predictSalesFromSavedModel(payload);
  }

  try {
    return await runPython([
      "predict",
      String(payload.marketingSpend),
      String(payload.storeVisitors),
      String(payload.discount),
      String(payload.seasonalityIndex),
    ]);
  } catch (error) {
    if (isPythonUnavailableError(error)) {
      console.warn("Python is unavailable. Falling back to saved model.json for predictions.");
      return predictSalesFromSavedModel(payload);
    }

    throw error;
  }
}

async function trainModel(csvPath) {
  if (isProductionRuntime()) {
    return {
      success: true,
      message: "CSV retraining is available locally. Live demo uses saved model.",
      model_file: "model.json",
      source: csvPath ? path.basename(csvPath) : "memory-upload.csv",
      fallback: true,
    };
  }

  return runPython(["train", csvPath]);
}

module.exports = { predictSales, trainModel };
