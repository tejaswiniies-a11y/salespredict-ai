const path = require("path");
const jwt = require("jsonwebtoken");

function sendPage(page) {
  return (req, res) => res.sendFile(path.join(__dirname, "..", "..", "frontend", "public", "views", page));
}

function requirePageAuth(role) {
  return (req, res, next) => {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.redirect("/login");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (role && decoded.role !== role) {
        return res.redirect(decoded.role === "admin" ? "/admin" : "/dashboard");
      }

      return next();
    } catch (error) {
      return res.redirect("/login");
    }
  };
}

module.exports = {
  home: sendPage("index.html"),
  login: sendPage("login.html"),
  register: sendPage("register.html"),
  dashboard: sendPage("dashboard.html"),
  admin: sendPage("admin.html"),
  about: sendPage("about.html"),
  terms: sendPage("terms.html"),
  privacy: sendPage("privacy.html"),
  requireUserPage: requirePageAuth(),
  requireAdminPage: requirePageAuth("admin"),
};
