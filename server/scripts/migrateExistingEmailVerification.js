const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Admin = require("../models/Admin");

const migrate = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

  await mongoose.connect(process.env.MONGO_URI);
  const legacyFilter = { emailVerificationRequired: { $exists: false } };
  const legacyValues = { $set: { isVerified: true, emailVerificationRequired: false } };

  const [students, faculties, admins] = await Promise.all([
    Student.updateMany(legacyFilter, legacyValues),
    Faculty.updateMany(legacyFilter, legacyValues),
    Admin.updateMany(legacyFilter, legacyValues),
  ]);

  console.log(`Migrated legacy accounts: students=${students.modifiedCount}, faculties=${faculties.modifiedCount}, admins=${admins.modifiedCount}`);
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error("Email-verification migration failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
