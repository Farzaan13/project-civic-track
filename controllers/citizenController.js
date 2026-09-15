const Issue = require("../models/Issue");
const Notification = require("../models/Notification");
const User = require("../models/User");

module.exports.dashboard = async (req, res) => {
  const issues = await Issue.find({ reportedBy: req.user._id }).sort({
    createdAt: -1,
  });

  const stats = {
    total: issues.length,
    reported: issues.filter((i) => i.status === "reported").length,
    inProgress: issues.filter((i) =>
      ["acknowledged", "in_progress"].includes(i.status)
    ).length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    totalUpvotesReceived: issues.reduce((sum, i) => sum + i.upvotes.length, 0),
  };

  const recentIssues = issues.slice(0, 5);

  res.render("dashboard", { stats, recentIssues });
};

module.exports.notifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .populate("issue", "title status")
    .sort({ createdAt: -1 });

  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.render("notifications", { notifications });
};

module.exports.renderProfile = (req, res) => {
  res.render("profile");
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { username, phone } = req.body;

    const existing = await User.findOne({
      username,
      _id: { $ne: req.user._id },
    });
    if (existing) {
      req.flash("error", "That username is already taken");
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user._id, {
      username,
      phone: phone || "",
    });

    req.flash("success", "Profile updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while updating your profile");
    res.redirect("/profile");
  }
};

module.exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      req.flash("error", "Current password is incorrect");
      return res.redirect("/profile");
    }

    user.password = newPassword;
    await user.save();

    req.flash("success", "Password updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while updating your password");
    res.redirect("/profile");
  }
};