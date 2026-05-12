const dotenv = require("dotenv");
const { app, startServer } = require("../server");

dotenv.config();

module.exports = async (req, res) => {
  try {
    await startServer();
    return app(req, res);
  } catch (error) {
    console.error("Vercel function startup failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server initialization failed.",
    });
  }
};
