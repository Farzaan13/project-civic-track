const Issue = require("../models/Issue");

module.exports.dashboard = async (req, res) => {
  const deptId = req.user.department;

  if (!deptId) {
    return res.render("staff/dashboard", {
      stats: { deptTotal: 0, myAssigned: 0, deptResolved: 0, deptOverdue: 0 },
      recentIssues: [],
      noDepartment: true,
    });
  }

  const deptIssues = await Issue.find({ assignedDept: deptId });

  const stats = {
    deptTotal: deptIssues.length,
    myAssigned: deptIssues.filter(
      (i) => i.assignedStaff && i.assignedStaff.equals(req.user._id)
    ).length,
    deptResolved: deptIssues.filter((i) => i.status === "resolved").length,
    deptOverdue: deptIssues.filter(
      (i) => i.slaDeadline && new Date() > i.slaDeadline && i.status !== "resolved"
    ).length,
  };

  const recentIssues = await Issue.find({ assignedDept: deptId })
    .populate("reportedBy", "username")
    .sort({ priority: -1, createdAt: -1 })
    .limit(5);

  res.render("staff/dashboard", { stats, recentIssues, noDepartment: false });
};

module.exports.myAssigned = async (req, res) => {
  const issues = await Issue.find({ assignedStaff: req.user._id })
    .populate("reportedBy", "username")
    .sort({ priority: -1, createdAt: -1 });

  res.render("staff/assigned", { issues });
};

module.exports.departmentIssues = async (req, res) => {
  if (!req.user.department) {
    return res.render("staff/department", { issues: [], noDepartment: true });
  }

  const issues = await Issue.find({ assignedDept: req.user.department })
    .populate("reportedBy", "username")
    .populate("assignedStaff", "username")
    .sort({ priority: -1, createdAt: -1 });

  res.render("staff/department", { issues, noDepartment: false });
};