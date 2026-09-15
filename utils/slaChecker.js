const Issue = require("../models/Issue");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * Find unresolved issues whose SLA deadline has passed
 * and mark them as escalated.
 *
 * Also sends an escalation notification to:
 * - All admins
 * - Staff members assigned to the issue's department
 */
async function checkSLAAndEscalate() {
  try {
    const now = new Date();

    const overdueIssues = await Issue.find({
      slaDeadline: { $lt: now },
      escalated: false,
      status: { $nin: ["resolved", "rejected"] },
    });

    console.log(
      `SLA Checker: ${overdueIssues.length} overdue issue(s) found.`
    );

    for (const issue of overdueIssues) {
      // Mark issue as escalated
      issue.escalated = true;
      issue.escalatedAt = now;

      await issue.save();

      console.log(
        `SLA ESCALATED → Issue ${issue._id}`
      );

      // ==========================================
      // FIND USERS WHO SHOULD RECEIVE NOTIFICATION
      // ==========================================

      const recipients = [];

      // 1. Find all admins
      const admins = await User.find({
        role: "admin",
      }).select("_id");

      recipients.push(...admins);

      // 2. Find staff belonging to this issue's department
      if (issue.assignedDept) {
        const departmentStaff = await User.find({
          role: "staff",
          department: issue.assignedDept,
        }).select("_id");

        recipients.push(...departmentStaff);
      }

      // Remove duplicate user IDs
      const uniqueRecipientIds = [
        ...new Set(
          recipients.map((user) => user._id.toString())
        ),
      ];

      // ==========================================
      // CREATE ESCALATION NOTIFICATIONS
      // ==========================================

      const message = `⚠️ SLA breached for issue "${issue.title}". Immediate attention required.`;

      for (const userId of uniqueRecipientIds) {
        // Prevent duplicate escalation notification
        const existingNotification = await Notification.findOne({
          user: userId,
          issue: issue._id,
          message,
        });

        if (existingNotification) {
          continue;
        }

        await Notification.create({
          user: userId,
          issue: issue._id,
          message,
          isRead: false,
        });

        console.log(
          `SLA notification created → User ${userId}`
        );
      }
    }

    return overdueIssues.length;
  } catch (error) {
    console.error(
      "SLA checker error:",
      error.message
    );

    return 0;
  }
}

module.exports = {
  checkSLAAndEscalate,
};
