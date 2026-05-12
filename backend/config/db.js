const mongoose = require("mongoose");

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    await connectionPromise;
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    connectionPromise = null;
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected.");
});

module.exports = connectDB;
