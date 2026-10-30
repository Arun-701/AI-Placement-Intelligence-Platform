require("dotenv").config();
const mongoose = require("mongoose");
const Faculty = require("../models/Faculty");

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);

  const [pending, approved] = await Promise.all([
    Faculty.updateMany(
      { approvalStatus: { $exists: false }, emailVerificationRequired: true },
      { $set: { approvalStatus: "PENDING" } }
    ),
    Faculty.updateMany(
      { approvalStatus: { $exists: false }, emailVerificationRequired: { $ne: true } },
      { $set: { approvalStatus: "APPROVED" } }
    )
  ]);

  console.log(`Faculty approval status migration complete: ${pending.modifiedCount} pending, ${approved.modifiedCount} approved.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
