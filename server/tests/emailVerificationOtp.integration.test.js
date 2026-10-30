const assert = require("assert");
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "email-verification-otp-test-secret";
process.env.EMAIL_HOST = "smtp.example.test";
process.env.EMAIL_PORT = "587";
process.env.EMAIL_USER = "verification@example.test";
process.env.EMAIL_PASSWORD = "not-a-real-password";

const Student = require("../models/Student");
const authRoutes = require("../routes/authRoutes");

const sentMessages = [];
let mailFailure = null;
const originalCreateTransport = nodemailer.createTransport;
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    if (mailFailure) throw mailFailure;
    sentMessages.push(message);
    return { accepted: [message.to] };
  },
});

const getOtp = (message) => message.text.match(/\b\d{6}\b/)?.[0];
const request = async (baseUrl, route, body) => fetch(`${baseUrl}/api/auth/${route}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const run = async () => {
  const mongo = await MongoMemoryServer.create();
  let server;
  try {
    await mongoose.connect(mongo.getUri());
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    server = await new Promise((resolve) => {
      const listener = app.listen(0, () => resolve(listener));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const email = "otp-flow@example.test";

    const registrationResponse = await request(baseUrl, "register", {
      name: "OTP Test Student",
      email,
      password: "TestPass1!",
      department: "Computer Science",
      year: 2,
    });
    assert.strictEqual(registrationResponse.status, 201);
    assert.match((await registrationResponse.json()).message, /sent a 6-digit verification code/);
    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].to, email);

    const student = await Student.findOne({ email });
    assert(student);
    assert.strictEqual(student.isVerified, false);
    assert.strictEqual(student.emailVerificationRequired, true);
    assert(student.emailVerificationOtpExpiresAt > new Date());
    const registrationOtp = getOtp(sentMessages[0]);
    assert.match(registrationOtp, /^\d{6}$/);

    const expiredOtp = String((Number(registrationOtp) + 1) % 1000000).padStart(6, "0");
    const wrongOtpResponse = await request(baseUrl, "verify-email-otp", { email, otp: expiredOtp });
    assert.strictEqual(wrongOtpResponse.status, 400);
    assert.strictEqual((await Student.findById(student._id)).emailVerificationOtpAttempts, 1);

    await Student.updateOne(
      { _id: student._id },
      { $set: { emailVerificationOtpExpiresAt: new Date(Date.now() - 1000) } }
    );
    const expirationResponse = await request(baseUrl, "verify-email-otp", { email, otp: registrationOtp });
    assert.strictEqual(expirationResponse.status, 400);
    assert.match((await expirationResponse.json()).message, /expired/);
    const expiredStudent = await Student.findById(student._id);
    assert.strictEqual(expiredStudent.emailVerificationOtpHash, "");
    assert.strictEqual(expiredStudent.emailVerificationOtpExpiresAt, null);

    await Student.updateOne(
      { _id: student._id },
      { $set: { emailVerificationLastSentAt: new Date(Date.now() - 61_000) } }
    );
    const resendResponse = await request(baseUrl, "resend-verification", { email });
    assert.strictEqual(resendResponse.status, 200);
    assert.strictEqual(sentMessages.length, 2);
    const resentOtp = getOtp(sentMessages[1]);
    assert.match(resentOtp, /^\d{6}$/);
    assert.notStrictEqual(resentOtp, registrationOtp);

    const previousOtpResponse = await request(baseUrl, "verify-email-otp", { email, otp: registrationOtp });
    assert.strictEqual(previousOtpResponse.status, 400);
    assert.match((await previousOtpResponse.json()).message, /Invalid verification code/);

    const cooldownResponse = await request(baseUrl, "resend-verification", { email });
    assert.strictEqual(cooldownResponse.status, 429);

    const verificationResponse = await request(baseUrl, "verify-email-otp", { email, otp: resentOtp });
    assert.strictEqual(verificationResponse.status, 200);
    const verifiedStudent = await Student.findById(student._id);
    assert.strictEqual(verifiedStudent.isVerified, true);
    assert.strictEqual(verifiedStudent.emailVerificationOtpHash, "");
    assert.strictEqual(verifiedStudent.emailVerificationOtpExpiresAt, null);

    const repeatedVerificationResponse = await request(baseUrl, "verify-email-otp", { email, otp: resentOtp });
    assert.strictEqual(repeatedVerificationResponse.status, 400);
    assert.match((await repeatedVerificationResponse.json()).message, /already verified/);

    const failedEmail = "otp-delivery-failure@example.test";
    mailFailure = Object.assign(new Error("self-signed certificate in certificate chain"), {
      code: "ESOCKET",
      command: "CONN",
      cause: Object.assign(new Error("self-signed certificate in certificate chain"), {
        code: "SELF_SIGNED_CERT_IN_CHAIN",
      }),
    });
    const failedRegistrationResponse = await request(baseUrl, "register", {
      name: "Delivery Failure Student",
      email: failedEmail,
      password: "TestPass1!",
      department: "Computer Science",
      year: 2,
    });
    assert.strictEqual(failedRegistrationResponse.status, 503);
    const failedRegistrationBody = await failedRegistrationResponse.json();
    assert.match(failedRegistrationBody.message, /SMTP certificate cannot be verified/);
    assert.strictEqual(failedRegistrationBody.data.accountCreated, true);
    const unverifiedAccount = await Student.findOne({ email: failedEmail });
    assert(unverifiedAccount);
    assert.strictEqual(unverifiedAccount.isVerified, false);
    assert(unverifiedAccount.emailVerificationOtpHash);
    assert.strictEqual(sentMessages.length, 2);

    await Student.updateOne(
      { _id: unverifiedAccount._id },
      { $set: { emailVerificationLastSentAt: new Date(Date.now() - 61_000) } }
    );
    const previousOtpHash = unverifiedAccount.emailVerificationOtpHash;
    const failedResendResponse = await request(baseUrl, "resend-verification", { email: failedEmail });
    assert.strictEqual(failedResendResponse.status, 503);
    assert.match((await failedResendResponse.json()).message, /SMTP certificate cannot be verified/);
    const afterFailedResend = await Student.findById(unverifiedAccount._id);
    assert.notStrictEqual(afterFailedResend.emailVerificationOtpHash, previousOtpHash);
    assert(afterFailedResend.emailVerificationOtpExpiresAt > new Date());
    assert.strictEqual(sentMessages.length, 2);

    mailFailure = Object.assign(
      new Error("Invalid login: 535-5.7.8 Username and Password not accepted"),
      { code: "EAUTH", command: "AUTH PLAIN", responseCode: 535 },
    );
    await Student.updateOne(
      { _id: unverifiedAccount._id },
      { $set: { emailVerificationLastSentAt: new Date(Date.now() - 61_000) } }
    );
    const failedAuthenticationResend = await request(baseUrl, "resend-verification", { email: failedEmail });
    assert.strictEqual(failedAuthenticationResend.status, 503);
    assert.match((await failedAuthenticationResend.json()).message, /SMTP provider.*account and app password/);

    console.log("Registration, OTP delivery handoff, expiration, resend cooldown, and verification integration tests passed.");
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await mongoose.disconnect();
    await mongo.stop();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
