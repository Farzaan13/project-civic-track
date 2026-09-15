const express = require("express");
const router = express.Router();

const citizenController = require("../controllers/citizenController");
const { isLoggedIn } = require("../middleware/auth");

router.get("/dashboard", isLoggedIn, citizenController.dashboard);

router.get("/notifications", isLoggedIn, citizenController.notifications);

router
  .route("/profile")
  .get(isLoggedIn, citizenController.renderProfile)
  .post(isLoggedIn, citizenController.updateProfile);

router.post(
  "/profile/password",
  isLoggedIn,
  citizenController.updatePassword
);

module.exports = router;