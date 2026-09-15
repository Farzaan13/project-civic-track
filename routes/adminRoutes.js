const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const upload = multer({ storage });

const adminController = require("../controllers/adminController");
const { isLoggedIn } = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.get(
  "/dashboard",
  isLoggedIn,
  roleCheck("admin", "staff"),
  adminController.dashboard
);

router.post(
  "/issues/:id/status",
  isLoggedIn,
  roleCheck("admin", "staff"),
  upload.single("proofImage"),
  adminController.updateStatus
);

router.post(
  "/issues/:id/assign",
  isLoggedIn,
  roleCheck("admin"),
  adminController.assignStaff
);

router.get(
  "/staff/new",
  isLoggedIn,
  roleCheck("admin"),
  adminController.renderCreateStaffForm
);

router.post(
  "/staff",
  isLoggedIn,
  roleCheck("admin"),
  adminController.createStaff
);

router.get(
  "/staff",
  isLoggedIn,
  roleCheck("admin"),
  adminController.staffList
);

router.get(
  "/staff/:id/edit",
  isLoggedIn,
  roleCheck("admin"),
  adminController.renderEditStaff
);

router.put(
  "/staff/:id",
  isLoggedIn,
  roleCheck("admin"),
  adminController.updateStaff
);

router.delete(
  "/staff/:id",
  isLoggedIn,
  roleCheck("admin"),
  adminController.deleteStaff
);

router.get(
  "/users",
  isLoggedIn,
  roleCheck("admin"),
  adminController.userList
);

router.delete(
  "/users/:id",
  isLoggedIn,
  roleCheck("admin"),
  adminController.deleteUser
);

router.get(
  "/departments",
  isLoggedIn,
  roleCheck("admin"),
  adminController.departmentList
);

router.get(
  "/departments/new",
  isLoggedIn,
  roleCheck("admin"),
  adminController.renderNewDepartment
);

router.post(
  "/departments",
  isLoggedIn,
  roleCheck("admin"),
  adminController.createDepartment
);

router.get(
  "/departments/:id/edit",
  isLoggedIn,
  roleCheck("admin"),
  adminController.renderEditDepartment
);

router.put(
  "/departments/:id",
  isLoggedIn,
  roleCheck("admin"),
  adminController.updateDepartment
);

router.delete(
  "/departments/:id",
  isLoggedIn,
  roleCheck("admin"),
  adminController.deleteDepartment
);

router.get(
  "/analytics",
  isLoggedIn,
  roleCheck("admin"),
  adminController.analytics
);

module.exports = router;
