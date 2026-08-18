const nodemailer = require("nodemailer");
const fs = require("fs");

const getTlsOptions = () => {
  const options = { minVersion: "TLSv1.2" };
  if (process.env.EMAIL_TLS_CA_PATH) {
    if (!fs.existsSync(process.env.EMAIL_TLS_CA_PATH)) {
      throw new Error("Configured EMAIL_TLS_CA_PATH does not exist");
    }
    options.ca = fs.readFileSync(process.env.EMAIL_TLS_CA_PATH);
  }
  return options;
};

const getTransporter = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error("Email service is not configured");
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    // Port 587 uses STARTTLS; this requires TLS rather than implicit TLS.
    requireTLS: Number(EMAIL_PORT) === 587,
    tls: getTlsOptions(),
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });
};

const verifyEmailTransport = async () => {
  await getTransporter().verify();
};

const sendVerificationOtpEmail = async ({ email, name, otp }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) throw new Error("Email service is not configured");

  await getTransporter().sendMail({
    from,
    to: email,
    subject: "Your AI Placement Platform verification code",
    text: `Hello ${name || ""},\n\nYour email verification code is:\n\n${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not create this account, you can safely ignore this email.`,
    html: `<p>Hello${name ? ` ${name}` : ""},</p><p>Your email verification code is:</p><p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p><p>This code expires in 10 minutes.</p><p>If you did not create this account, you can safely ignore this email.</p>`,
  });
};

module.exports = { sendVerificationOtpEmail, verifyEmailTransport };
