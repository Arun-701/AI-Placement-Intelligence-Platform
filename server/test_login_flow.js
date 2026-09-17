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
    console.log('=== TESTING LOGIN LOGIC ===');
    console.log('Email to find:', email);
    console.log('Normalized to:', email.trim().toLowerCase());
    
    // Step 1: Find student
    console.log('\nStep 1: Finding student in database...');
    const student = await Student.findOne({ email: email.trim().toLowerCase() });
    
    if (!student) {
      console.log('✗ Student not found');
      process.exit(1);
    }
    console.log('✓ Student found');
    
    // Step 2: Check active status
    console.log('\nStep 2: Checking account status...');
    console.log('Is active:', student.isActive);
    if (!student.isActive) {
      console.log('✗ PROBLEM: Account is deactivated');
      process.exit(1);
    }
    console.log('✓ Account is active');
    
    // Step 3: Check email verification
    console.log('\nStep 3: Checking email verification...');
    console.log('Verification required:', student.emailVerificationRequired);
    console.log('Is verified:', student.isVerified);
    if (student.emailVerificationRequired === true && student.isVerified !== true) {
      console.log('✗ PROBLEM: Email verification required but not verified');
      process.exit(1);
    }
    console.log('✓ Email verification check passed');
    
    // Step 4: Test password comparison (without printing the password)
    console.log('\nStep 4: Testing password verification...');
    console.log('Stored hash type check:');
    console.log('  Hash starts with $2b:', student.password.startsWith('$2b'));
    console.log('  Hash length:', student.password.length);
    
    // We cannot test without the actual password, but we can check hash format
    try {
      // Try comparing with a wrong password to test if bcrypt.compare works
      const wrongResult = await bcrypt.compare('wrongpassword', student.password);
      console.log('  bcrypt.compare() works:', 'YES');
      console.log('  Comparing with wrong password:', wrongResult ? 'MATCHED (unexpected)' : 'NO MATCH (expected)');
    } catch (err) {
      console.log('  ✗ bcrypt.compare() error:', err.message);
      console.log('  PROBLEM: bcrypt compare failed - hash might be corrupted');
      process.exit(1);
    }
    
    console.log('\n✓ All authentication checks would pass');
    console.log('\nCONCLUSION: Database and account setup appear correct.');
    console.log('The issue is likely:');
    console.log('1. Incorrect password being entered');
    console.log('2. Frontend not sending email correctly');
    console.log('3. Backend API endpoint not being called correctly');
    console.log('4. JWT_SECRET configuration issue');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
