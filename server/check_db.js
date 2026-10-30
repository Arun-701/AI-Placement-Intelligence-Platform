const mongoose = require('mongoose');
const Assessment = require('./models/Assessment');
const Admin = require('./models/Admin');

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/aptitude_test');
    console.log('Connected to MongoDB');

    // Check assessment
    const assessment = await Assessment.findById('6abaa5cca74c289ee8a3f1b3');
    console.log('\n=== ASSESSMENT ===');
    console.log('Found:', assessment ? 'YES' : 'NO');
    if (assessment) {
      console.log('Title:', assessment.title);
      console.log('Questions:', assessment.questions?.length || 0);
      console.log('Question Sets:', assessment.questionSets?.length || 0);
      if (assessment.questionSets?.length > 0) {
        assessment.questionSets.forEach((qs, i) => {
          console.log(`  Set ${i}: ${qs.questions?.length || 0} questions`);
        });
      }
      console.log('Status:', assessment.status);
    }

    // Check admin
    const admin = await Admin.findOne({ email: 'admin@example.com' });
    console.log('\n=== ADMIN ===');
    console.log('Found:', admin ? 'YES' : 'NO');
    if (admin) {
      console.log('Email:', admin.email);
      console.log('Verified:', admin.emailVerificationRequired === false);
      // Mark as verified if needed
      if (admin.emailVerificationRequired) {
        admin.emailVerificationRequired = false;
        await admin.save();
        console.log('✓ Marked as verified');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
