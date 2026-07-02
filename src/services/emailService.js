import nodemailer from "nodemailer";
import "dotenv/config";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

let transporter = null;

if (gmailUser && gmailAppPassword) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
} else {
  console.warn("⚠️ Gmail SMTP credentials not set or incomplete — email sending disabled.");
}

/**
 * Send an email via Gmail SMTP using nodemailer.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 */
export const sendEmail = async (to, subject, html) => {
  if (!transporter) {
    console.log("[Email] Gmail transporter not configured — skipping email send.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Shifa Store" <${gmailUser}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to} via Gmail SMTP. Message ID: ${info.messageId}`);
  } catch (err) {
    console.error("❌ Failed to send email via Gmail SMTP:", err.message);
  }
};
