const express = require("express");
const router = express.Router();

const staffController = require("../controllers/staffController");
const { isLoggedIn } = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.get(
  "/dashboard",
  isLoggedIn,
  roleCheck("staff"),
  staffController.dashboard
);

router.get(
  "/assigned",
  isLoggedIn,
  roleCheck("staff"),
  staffController.myAssigned
);

router.get(
  "/department",
  isLoggedIn,
  roleCheck("staff"),
  staffController.departmentIssues
);

module.exports = router;