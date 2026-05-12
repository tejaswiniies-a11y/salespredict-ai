const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("../backend/config/db");
const User = require("../backend/models/User");

dotenv.config();

async function run() {
  await connectDB();

  if (!process.env.ADMIN_EMAIL) {
    throw new Error("ADMIN_EMAIL is required in .env");
  }

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log("Existing user updated to admin.");
    process.exit(0);
  }

  const password = process.argv[2] || "Admin@123";
  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({
    name: "Administrator",
    email: process.env.ADMIN_EMAIL.toLowerCase(),
    password: hashedPassword,
    role: "admin",
  });

  console.log("Admin user created successfully.");
  process.exit(0);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
