const mongoose = require('mongoose');
const Assessment = require('./models/Assessment');
const Admin = require('./models/Admin');

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-placement-platform');
    console.log('Connected to MongoDB (ai-placement-platform)');

    // List all assessments
    const assessments = await Assessment.find({}).select('_id title questions questionSets status createdByAdmin').sort({ createdAt: -1 }).limit(5);
    console.log('\n=== RECENT ASSESSMENTS ===');
    console.log(`Found ${assessments.length} assessments:`);
    assessments.forEach(a => {
      console.log(`\n  ID: ${a._id}`);
      console.log(`  Title: ${a.title}`);
      console.log(`  Questions: ${a.questions?.length || 0}`);
      console.log(`  Question Sets: ${a.questionSets?.length || 0}`);
      console.log(`  Status: ${a.status}`);
      console.log(`  Created by Admin: ${a.createdByAdmin ? 'YES' : 'NO'}`);
    });

    // Find the specific assessment
    const test1 = await Assessment.findOne({ title: 'test1' });
    if (test1) {
      console.log('\n=== test1 ASSESSMENT ===');
      console.log('ID:', test1._id);
      console.log('Found: YES');
    }

    // List all admins
    const admins = await Admin.find({}).select('_id email emailVerificationRequired');
    console.log('\n=== ALL ADMINS ===');
    console.log(`Found ${admins.length} admins:`);
    admins.forEach(a => {
      console.log(`  ${a.email} | Verified: ${a.emailVerificationRequired === false}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
