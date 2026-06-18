import nodemailer from "nodemailer";

// Lazy singleton — created on first call so dotenv has already run by then
// (ES module imports are hoisted, so module-level creation reads undefined env vars)
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        "SMTP credentials are missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env"
      );
    }
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: parseInt(process.env.SMTP_PORT) == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

const sendMail = async ({ to, subject, html }) => {
  await getTransporter().sendMail({
    from: `"SQAC Portal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

export default sendMail;
