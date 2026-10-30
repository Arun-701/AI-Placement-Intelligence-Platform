const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');
require('dotenv').config();

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected\n');
    
    const email = 'krishnanbaby777@gmail.com';
    const password = 'TestPassword123!'; // Using a test password
    
    console.log('=== DETAILED LOGIN SIMULATION ===');
    console.log('Email provided:', email);
    console.log('Testing with password: [TEST PASSWORD]\n');
    
    // Exact code from loginStudent function
    const emailNormalized = email.trim().toLowerCase();
    console.log('Email normalized to:', emailNormalized);
    
    const student = await Student.findOne({ email: emailNormalized });
    
    if (!student) {
      console.log('FAIL: Student not found');
      process.exit(1);
    }
    console.log('✓ Student found in database');
    
    if (!student.isActive) {
      console.log('FAIL: Account is deactivated');
      process.exit(1);
    }
    console.log('✓ Account is active');
    
    console.log('\nPassword verification:');
    console.log('Password provided length:', password.length);
    console.log('Password hash stored:', student.password.substring(0, 20) + '...');
    
    const isMatch = await bcrypt.compare(password, student.password);
    console.log('bcrypt.compare result:', isMatch);
    
    if (!isMatch) {
      console.log('\n✗ PASSWORD MISMATCH');
      console.log('\nThis means:');
      console.log('- The password provided does NOT match the stored hash');
      console.log('- Either the password is incorrect');
      console.log('- Or the stored hash is corrupted');
      console.log('- Or a different password was used when creating the account');
    } else {
      console.log('\n✓ Password matches!');
    }
    
    if (student.emailVerificationRequired === true && student.isVerified !== true) {
      console.log('FAIL: Email verification required');
      process.exit(1);
    }
    console.log('✓ Email verification check passed');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
