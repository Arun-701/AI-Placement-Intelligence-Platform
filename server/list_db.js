const mongoose = require('mongoose');
const Assessment = require('./models/Assessment');
const Admin = require('./models/Admin');

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/aptitude_test');
    console.log('Connected to MongoDB');

    // List all assessments
    const assessments = await Assessment.find({}).select('_id title questions questionSets status');
    console.log('\n=== ALL ASSESSMENTS ===');
    console.log(`Found ${assessments.length} assessments:`);
    assessments.forEach(a => {
      console.log(`  ${a._id} | ${a.title} | ${a.questions?.length || 0} questions | ${a.questionSets?.length || 0} question sets`);
    });

    // List all admins
    const admins = await Admin.find({}).select('_id email emailVerificationRequired');
    console.log('\n=== ALL ADMINS ===');
    console.log(`Found ${admins.length} admins:`);
    admins.forEach(a => {
      console.log(`  ${a._id} | ${a.email} | Verified: ${a.emailVerificationRequired === false}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
