import User from "../models/User.js";
import sendMail from "../lib/mailer.js";

/**
 * POST /api/mail/send
 * Body: { subject, body, recipientIds[] OR sendToAll: true }
 * Requires SEND_MASS_MAIL permission (secretary, joint_secretary).
 */
export const sendMassMail = async (req, res) => {
  try {
    const { subject, body, recipientIds, sendToAll } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: "subject and body are required" });
    }

    // Resolve recipient emails
    let recipients = [];

    if (sendToAll) {
      recipients = await User.find({}, "email name").lean();
    } else if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      recipients = await User.find(
        { _id: { $in: recipientIds } },
        "email name"
      ).lean();
    } else {
      return res.status(400).json({
        error: "Provide recipientIds[] or set sendToAll: true",
      });
    }

    if (recipients.length === 0) {
      return res.status(404).json({ error: "No recipients found" });
    }

    let sent = 0;
    const failed = [];

    // Send emails in batches of 10 to avoid overwhelming SMTP
    const BATCH_SIZE = 10;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((r) =>
          sendMail({
            to: r.email,
            subject,
            html: body,
          })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failed.push({
            email: batch[idx].email,
            error: result.reason?.message || "Unknown error",
          });
        }
      });
    }

    res.json({ sent, failed });
  } catch (err) {
    console.error("sendMassMail error:", err);
    res.status(500).json({ error: "Failed to send emails" });
  }
};
