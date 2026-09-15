const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.route("/register")
  .get(authController.renderRegister)
  .post(authController.register);

router.route("/login")
  .get(authController.renderLogin)
  .post(authController.login);

router.get("/logout", authController.logout);

module.exports = router;
