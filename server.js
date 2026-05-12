const dotenv = require("dotenv");
const app = require("./backend/app");

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
let serverStarted = false;

async function startServer() {
  try {
    if (serverStarted) {
      return app;
    }

    if (process.env.NODE_ENV === "production") {
      return app;
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    serverStarted = true;

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server process and try again.`);
        process.exit(1);
      }

      console.error("Server failed to start:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
    throw error;
  }
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}

module.exports = { app, startServer };
