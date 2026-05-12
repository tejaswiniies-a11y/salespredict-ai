const express = require("express");
const pageController = require("../controllers/pageController");

const router = express.Router();

router.get("/", pageController.home);
router.get("/login", pageController.login);
router.get("/register", pageController.register);
router.get("/dashboard", pageController.requireUserPage, pageController.dashboard);
router.get("/admin", pageController.requireAdminPage, pageController.admin);
router.get("/about", pageController.about);
router.get("/terms", pageController.terms);
router.get("/privacy", pageController.privacy);

module.exports = router;
