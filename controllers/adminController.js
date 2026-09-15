const Issue = require("../models/Issue");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const { sendStatusUpdateEmail } = require("../utils/mailer");

module.exports.dashboard = async (req, res) => {
  const filter = {};
  // staff only see issues assigned to their department
  if (req.user.role === "staff" && req.user.department) {
    filter.assignedDept = req.user.department;
  }

  const issues = await Issue.find(filter)
    .populate("reportedBy", "username")
    .populate("assignedDept", "name")
    .populate("assignedStaff", "username")
    .sort({ priority: -1, createdAt: -1 });

  const stats = {
    total: issues.length,
    reported: issues.filter((i) => i.status === "reported").length,
    inProgress: issues.filter((i) => i.status === "in_progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    overdue: issues.filter(
      (i) => i.slaDeadline && new Date() > i.slaDeadline && i.status !== "resolved"
    ).length,
  };

  const staffList =
    req.user.role === "admin" ? await User.find({ role: "staff" }) : [];

  res.render("admin/dashboard", { issues, stats, staffList });
};

module.exports.updateStatus = async (req, res) => {
  const { status, note } = req.body;
  const issue = await Issue.findById(req.params.id).populate("reportedBy", "username email");

  if (!issue) {
    req.flash("error", "Issue not found");
    return res.redirect("/admin/dashboard");
  }

  // Require a proof photo before an issue can be marked resolved
  if (status === "resolved" && !req.file && !(issue.resolutionImage && issue.resolutionImage.url)) {
    req.flash("error", "Please upload a proof photo before marking this issue as resolved");
    return res.redirect(`/issues/${issue._id}`);
  }

  if (req.file) {
    issue.resolutionImage = { url: req.file.path, filename: req.file.filename };
  }

  issue.status = status;
  issue.statusHistory.push({
    status,
    updatedBy: req.user._id,
    note: note || "",
  });

  if (status === "resolved") {
    issue.resolvedAt = new Date();
  }

  await issue.save();

  try {
    await Notification.create({
      user: issue.reportedBy._id,
      issue: issue._id,
      message: `Your report "${issue.title}" is now ${status.replace("_", " ")}`,
    });
  } catch (err) {
    console.error("Failed to create in-app notification:", err.message);
  }

  sendStatusUpdateEmail({
    toEmail: issue.reportedBy.email,
    toName: issue.reportedBy.username,
    issueTitle: issue.title,
    issueId: issue._id,
    newStatus: status,
    note,
  });

  req.flash("success", "Issue status updated");
  res.redirect(`/issues/${issue._id}`);
};

module.exports.assignStaff = async (req, res) => {
  const { staffId } = req.body;
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    req.flash("error", "Issue not found");
    return res.redirect("/admin/dashboard");
  }

  issue.assignedStaff = staffId;
  if (issue.status === "reported") {
    issue.status = "acknowledged";
    issue.statusHistory.push({
      status: "acknowledged",
      updatedBy: req.user._id,
      note: "Assigned to staff",
    });
  }
  await issue.save();

  // Notify the assigned staff member (non-blocking)
  try {
    await Notification.create({
      user: staffId,
      issue: issue._id,
      message: `You have been assigned to issue "${issue.title}"`,
    });
  } catch (err) {
    console.error("Failed to notify assigned staff:", err.message);
  }

  req.flash("success", "Staff assigned successfully");
  res.redirect("/admin/dashboard");

};

module.exports.renderCreateStaffForm = async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.render("admin/create-staff", { departments });
};

module.exports.createStaff = async (req, res) => {
  try {
    const { username, email, password, department, phone } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash("error", "Username or email already registered");
      return res.redirect("/admin/staff/new");
    }

    const staff = new User({
      username,
      email,
      password,
      phone: phone || "",
      role: "staff",
      department: department || null,
    });

    await staff.save();

    req.flash("success", `Staff account created for ${staff.username}`);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while creating the staff account");
    res.redirect("/admin/staff/new");
  }
};
// ============ STAFF MANAGEMENT ============
module.exports.staffList = async (req, res) => {
  const staffMembers = await User.find({ role: "staff" })
    .populate("department", "name")
    .sort({ createdAt: -1 });

  const staffWithCounts = await Promise.all(
    staffMembers.map(async (s) => {
      const assignedCount = await Issue.countDocuments({ assignedStaff: s._id });
      const resolvedCount = await Issue.countDocuments({
        assignedStaff: s._id,
        status: "resolved",
      });
      return { ...s.toObject(), assignedCount, resolvedCount };
    })
  );

  res.render("admin/staff-list", { staffMembers: staffWithCounts });
};

module.exports.renderEditStaff = async (req, res) => {
  const staffMember = await User.findById(req.params.id);
  const departments = await Department.find().sort({ name: 1 });

  if (!staffMember || staffMember.role !== "staff") {
    req.flash("error", "Staff member not found");
    return res.redirect("/admin/staff");
  }

  res.render("admin/edit-staff", { staffMember, departments });
};

module.exports.updateStaff = async (req, res) => {
  const { username, phone, department } = req.body;
  const staffMember = await User.findById(req.params.id);

  if (!staffMember || staffMember.role !== "staff") {
    req.flash("error", "Staff member not found");
    return res.redirect("/admin/staff");
  }

  staffMember.username = username;
  staffMember.phone = phone || "";
  staffMember.department = department || null;
  await staffMember.save();

  req.flash("success", "Staff details updated");
  res.redirect("/admin/staff");
};

module.exports.deleteStaff = async (req, res) => {
  const staffMember = await User.findById(req.params.id);

  if (!staffMember || staffMember.role !== "staff") {
    req.flash("error", "Staff member not found");
    return res.redirect("/admin/staff");
  }

  await Issue.updateMany(
    { assignedStaff: staffMember._id },
    { $set: { assignedStaff: null } }
  );
  await User.findByIdAndDelete(staffMember._id);

  req.flash("success", "Staff account removed");
  res.redirect("/admin/staff");
};

// ============ USER MANAGEMENT ============
module.exports.userList = async (req, res) => {
  const { search } = req.query;
  const filter = { role: "citizen" };

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter).sort({ createdAt: -1 });

  const usersWithCounts = await Promise.all(
    users.map(async (u) => {
      const issueCount = await Issue.countDocuments({ reportedBy: u._id });
      return { ...u.toObject(), issueCount };
    })
  );

  res.render("admin/user-list", { users: usersWithCounts, search: search || "" });
};

module.exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== "citizen") {
    req.flash("error", "User not found");
    return res.redirect("/admin/users");
  }

  await User.findByIdAndDelete(user._id);
  req.flash("success", "User account removed");
  res.redirect("/admin/users");
};

// ============ DEPARTMENT MANAGEMENT ============
const CATEGORY_OPTIONS = [
  "pothole",
  "road_damage",
  "garbage",
  "streetlight",
  "water_leakage",
  "electricity",
  "drainage",
  "other",
];

module.exports.departmentList = async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });

  const departmentsWithCounts = await Promise.all(
    departments.map(async (d) => {
      const issueCount = await Issue.countDocuments({ assignedDept: d._id });
      const staffCount = await User.countDocuments({
        role: "staff",
        department: d._id,
      });
      return { ...d.toObject(), issueCount, staffCount };
    })
  );

  res.render("admin/department-list", { departments: departmentsWithCounts });
};

module.exports.renderNewDepartment = (req, res) => {
  res.render("admin/department-form", {
    department: null,
    categoryOptions: CATEGORY_OPTIONS,
  });
};

module.exports.createDepartment = async (req, res) => {
  try {
    const { name, categories, slaHours } = req.body;
    const categoryList = Array.isArray(categories)
      ? categories
      : categories
      ? [categories]
      : [];

    await Department.create({
      name,
      categories: categoryList,
      slaHours: Number(slaHours) || 72,
    });

    req.flash("success", "Department created");
    res.redirect("/admin/departments");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong creating the department");
    res.redirect("/admin/departments/new");
  }
};

module.exports.renderEditDepartment = async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    req.flash("error", "Department not found");
    return res.redirect("/admin/departments");
  }

  res.render("admin/department-form", {
    department,
    categoryOptions: CATEGORY_OPTIONS,
  });
};

module.exports.updateDepartment = async (req, res) => {
  try {
    const { name, categories, slaHours } = req.body;
    const categoryList = Array.isArray(categories)
      ? categories
      : categories
      ? [categories]
      : [];

    await Department.findByIdAndUpdate(req.params.id, {
      name,
      categories: categoryList,
      slaHours: Number(slaHours) || 72,
    });

    req.flash("success", "Department updated");
    res.redirect("/admin/departments");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong updating the department");
    res.redirect(`/admin/departments/${req.params.id}/edit`);
  }
};

module.exports.deleteDepartment = async (req, res) => {
  const issueCount = await Issue.countDocuments({ assignedDept: req.params.id });

  if (issueCount > 0) {
    req.flash(
      "error",
      `Can't delete: ${issueCount} issue(s) are still linked to this department`
    );
    return res.redirect("/admin/departments");
  }

  await Department.findByIdAndDelete(req.params.id);
  req.flash("success", "Department deleted");
  res.redirect("/admin/departments");
};

module.exports.analytics = async (req, res) => {
  const byCategory = await Issue.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const byStatus = await Issue.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const avgResolutionTime = await Issue.aggregate([
    { $match: { status: "resolved", resolvedAt: { $ne: null } } },
    {
      $project: {
        resolutionHours: {
          $divide: [
            { $subtract: ["$resolvedAt", "$createdAt"] },
            1000 * 60 * 60,
          ],
        },
      },
    },
    { $group: { _id: null, avgHours: { $avg: "$resolutionHours" } } },
  ]);

  const avgRatingResult = await Issue.aggregate([
    { $match: { "feedback.submittedAt": { $ne: null } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$feedback.rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const staffPerformance = await Issue.aggregate([
    { $match: { status: "resolved", assignedStaff: { $ne: null } } },
    { $group: { _id: "$assignedStaff", resolvedCount: { $sum: 1 } } },
    { $sort: { resolvedCount: -1 } },
  ]);
  const staffIds = staffPerformance.map((s) => s._id);
  const staffUsers = await User.find({ _id: { $in: staffIds } });
  const staffPerformanceNamed = staffPerformance.map((s) => {
    const user = staffUsers.find((u) => u._id.equals(s._id));
    return {
      name: user ? user.username : "Unknown",
      resolvedCount: s.resolvedCount,
    };
  });

  const departments = await Department.find();
  const departmentPerformance = await Promise.all(
    departments.map(async (dept) => {
      const total = await Issue.countDocuments({ assignedDept: dept._id });
      const resolved = await Issue.countDocuments({
        assignedDept: dept._id,
        status: "resolved",
      });
      const overdue = await Issue.countDocuments({
        assignedDept: dept._id,
        slaDeadline: { $lt: new Date() },
        status: { $ne: "resolved" },
      });
      return { name: dept.name, total, resolved, overdue };
    })
  );

  res.render("admin/analytics", {
    byCategory,
    byStatus,
    avgResolutionHours: avgResolutionTime[0]?.avgHours || 0,
    avgRating: avgRatingResult[0]?.avgRating || 0,
    ratingCount: avgRatingResult[0]?.count || 0,
    staffPerformance: staffPerformanceNamed,
    departmentPerformance,
  });
};