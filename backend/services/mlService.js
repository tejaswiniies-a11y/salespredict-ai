const { spawn } = require("child_process");
const path = require("path");

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
    const scriptPath = path.resolve(__dirname, "..", "..", "train_model.py");
    const projectRoot = path.resolve(__dirname, "..", "..");
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

async function runPython(args) {
  const projectRoot = path.resolve(__dirname, "..", "..");
  const resolvedArgs = args.map((arg, index) => {
    if (index === 1 && args[0] === "train") {
      return path.resolve(projectRoot, String(arg));
    }

    return String(arg);
  });

  const commands = [];
  if (process.env.PYTHON_PATH) {
    commands.push(process.env.PYTHON_PATH);
  }
  commands.push("python", "py");

  let lastError;
  for (const command of [...new Set(commands)]) {
    try {
      return await runPythonWithCommand(command, resolvedArgs);
    } catch (error) {
      lastError = error;
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw lastError || new Error('Python was not found. Install Python or configure PYTHON_PATH.');
}

function predictSales(payload) {
  return runPython([
    "predict",
    String(payload.marketingSpend),
    String(payload.storeVisitors),
    String(payload.discount),
    String(payload.seasonalityIndex),
  ]);
}

function trainModel(csvPath) {
  return runPython(["train", csvPath]);
}

module.exports = { predictSales, trainModel };
