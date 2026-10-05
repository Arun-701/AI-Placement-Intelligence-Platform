require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Student = require("../models/Student");

const inspectCodingProfiles = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const students = await Student.find({ codechef: { $ne: "" } })
    .select("name email codechef leetcode github codingProfile")
    .lean();
  console.log(JSON.stringify(students, null, 2));
  await mongoose.disconnect();
};

inspectCodingProfiles().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
