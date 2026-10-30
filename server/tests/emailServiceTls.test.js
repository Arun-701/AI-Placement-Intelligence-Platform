const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const tls = require("tls");
const nodemailer = require("nodemailer");

const originalCreateTransport = nodemailer.createTransport;
const originalEnv = {
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_TLS_CA_PATH: process.env.EMAIL_TLS_CA_PATH,
};
const customCaPath = path.join(os.tmpdir(), `email-ca-${process.pid}.pem`);

const restoreEnvironment = () => {
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  nodemailer.createTransport = originalCreateTransport;
  if (fs.existsSync(customCaPath)) fs.unlinkSync(customCaPath);
};

const run = async () => {
  try {
    process.env.EMAIL_HOST = "smtp.example.test";
    process.env.EMAIL_PORT = "587";
    process.env.EMAIL_USER = "faculty@example.test";
    process.env.EMAIL_PASSWORD = "not-a-real-password";
    delete process.env.EMAIL_TLS_CA_PATH;

    let transportOptions;
    nodemailer.createTransport = (options) => {
      transportOptions = options;
      return { verify: async () => true };
    };

    const emailService = require("../services/emailService");
    await emailService.verifyEmailTransport();

    assert.strictEqual(transportOptions.tls.minVersion, "TLSv1.2");
    assert.strictEqual(transportOptions.requireTLS, true);
    assert.strictEqual(transportOptions.tls.rejectUnauthorized, undefined);
    assert(tls.rootCertificates.every((certificate) => transportOptions.tls.ca.includes(certificate)));
    if (typeof tls.getCACertificates === "function") {
      assert(tls.getCACertificates("system").every((certificate) => transportOptions.tls.ca.includes(certificate)));
    }

    const customCertificate = tls.rootCertificates[0];
    fs.writeFileSync(customCaPath, `${customCertificate}\n${customCertificate}`, "utf8");
    process.env.EMAIL_TLS_CA_PATH = customCaPath;
    await emailService.verifyEmailTransport();
    assert(transportOptions.tls.ca.includes(customCertificate));
    assert.strictEqual(new Set(transportOptions.tls.ca).size, transportOptions.tls.ca.length);

    process.env.EMAIL_TLS_CA_PATH = path.join(os.tmpdir(), `missing-ca-${process.pid}.pem`);
    await assert.rejects(emailService.verifyEmailTransport(), /EMAIL_TLS_CA_PATH does not exist/);

    fs.writeFileSync(customCaPath, "not a PEM certificate", "utf8");
    process.env.EMAIL_TLS_CA_PATH = customCaPath;
    await assert.rejects(emailService.verifyEmailTransport(), /must contain PEM-encoded CA certificates/);

    console.log("Email TLS trust configuration tests passed.");
  } finally {
    restoreEnvironment();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
