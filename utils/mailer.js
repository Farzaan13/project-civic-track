const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // email not configured - skip silently
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password, not your normal password
    },
  });

  return transporter;
}

const STATUS_LABELS = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

/**
 * Sends a status-update email to the person who reported the issue.
 * Fails silently (logs only) if email isn't configured or sending fails -
 * this should never block the actual status update from saving.
 */
async function sendStatusUpdateEmail({ toEmail, toName, issueTitle, issueId, newStatus, note }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log("Email not configured - skipping notification email");
    return;
  }

  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const issueUrl = `${process.env.APP_URL || "http://localhost:8080"}/issues/${issueId}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: `Your report "${issueTitle}" is now ${statusLabel} — CivicTrack`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#14213D;">Status Update</h2>
        <p>Hi ${toName},</p>
        <p>Your reported issue <strong>"${issueTitle}"</strong> has been updated to:</p>
        <p style="font-size:18px; font-weight:bold; color:#E85D04;">${statusLabel}</p>
        ${note ? `<p style="color:#4A5568;">Note from municipal staff: ${note}</p>` : ""}
        <p><a href="${issueUrl}" style="color:#3B6EA5;">View full details &rarr;</a></p>
        <hr style="border:none; border-top:1px solid #DCD7CA; margin:20px 0;">
        <p style="font-size:12px; color:#8B93A1;">CivicTrack — Crowdsourced Civic Issue Reporting System</p>
      </div>
    `,
  };

  try {
    await mailer.sendMail(mailOptions);
    console.log(`Status update email sent to ${toEmail}`);
  } catch (err) {
    console.error("Failed to send status update email:", err.message);
  }
}

module.exports = { sendStatusUpdateEmail };