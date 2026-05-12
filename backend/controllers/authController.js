const {
  signToken,
  sendAuthCookie,
  createUser,
  validateUserCredentials,
  serializeUser,
} = require("../services/authService");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const user = await createUser({ name, email, password });
    const token = signToken(user);
    sendAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: serializeUser(user),
    });
  } catch (error) {
    const status = error.message === "Email already registered." ? 400 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await validateUserCredentials({ email, password });
    const token = signToken(user);
    sendAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Login successful.",
      user: serializeUser(user),
    });
  } catch (error) {
    const status = error.message === "Invalid credentials." ? 401 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie("token");
  return res.json({ success: true, message: "Logged out successfully." });
};

exports.getMe = async (req, res) => {
  return res.json({ success: true, user: req.user });
};
