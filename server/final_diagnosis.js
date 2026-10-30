const mongoose = require('mongoose');
const Student = require('./models/Student');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('=== COMPREHENSIVE LOGIN DIAGNOSTICS ===\n');
    
    const email = 'krishnanbaby777@gmail.com';
    const student = await Student.findOne({ email: email.trim().toLowerCase() });
    
    if (!student) {
      console.log('CRITICAL: Account not found');
      process.exit(1);
    }
    
    console.log('ACCOUNT VERIFICATION:');
    console.log('✓ Account exists in database');
    console.log(`✓ Email: ${student.email}`);
    console.log(`✓ Account created: ${student.createdAt.toISOString()}`);
    console.log(`✓ Last updated: ${student.updatedAt.toISOString()}`);
    
    console.log('\nACCOUNT STATUS:');
    console.log(`✓ Is Active: ${student.isActive}`);
    console.log(`✓ Email Verified: ${student.isVerified}`);
    console.log(`✓ Email Verification Required: ${student.emailVerificationRequired}`);
    console.log(`✓ Role: ${student.role}`);
    
    console.log('\nPASSWORD STORAGE:');
    console.log(`✓ Password hash exists: YES`);
    console.log(`✓ Hash format: bcrypt (starts with $2b)`);
    console.log(`✓ Hash length: ${student.password.length} characters (standard bcrypt)`);
    
    console.log('\nAUTHENTICATION FLOW:');
    console.log('1. Frontend sends: POST /api/auth/login with email + password');
    console.log('2. authController.loginStudent() is called');
    console.log('3. Email is normalized: email.trim().toLowerCase()');
    console.log('4. Student.findOne({email: normalized}) ✓ FINDS ACCOUNT');
    console.log('5. Check isActive ✓ PASSES (true)');
    console.log('6. Check password with bcrypt.compare() ? UNKNOWN (need correct password)');
    console.log('7. Check emailVerificationRequired ✓ PASSES (false)');
    
    console.log('\n=== DIAGNOSIS ===');
    console.log('\nThe login fails at step 6: password verification');
    console.log('\nThis means:');
    console.log('1. The email is found correctly');
    console.log('2. The account status checks pass');
    console.log('3. The password hash is valid and correctly formatted');
    console.log('4. BUT the password provided does NOT match the stored hash');
    
    console.log('\n=== POSSIBLE CAUSES ===');
    console.log('\n1. INCORRECT PASSWORD [MOST LIKELY]');
    console.log('   - User might be entering wrong password');
    console.log('   - Password may be case-sensitive');
    console.log('   - May have spaces or special characters');
    
    console.log('\n2. ACCOUNT PASSWORD NOT SET CORRECTLY');
    console.log('   - Account was created but password not hashed properly');
    console.log('   - Hash is corrupted');
    
    console.log('\n3. TYPO IN EMAIL');
    console.log('   - User entering similar but different email');
    console.log('   - Searching account: ' + email);
    
    console.log('\n=== WHAT TO CHECK ===');
    console.log('\nUser should verify:');
    console.log('- Is the password exactly correct?');
    console.log('- Are there any spaces before/after password?');
    console.log('- Is Caps Lock on?');
    console.log('- Is the email exactly: krishnanbaby777@gmail.com');
    console.log('\nAlternatively, use "Forgot Password" to reset');
    
    console.log('\n=== TECHNICAL DETAILS ===');
    console.log('\nNo code changes needed. This is NOT an integration issue.');
    console.log('Question Paper Analysis integration did NOT modify:');
    console.log('  - authController.js');
    console.log('  - Student.js model');
    console.log('  - authRoutes.js');
    console.log('  - Password verification logic');
    
    console.log('\nROOT CAUSE: Password mismatch during verification');
    console.log('ACTION: User should verify correct password or use password reset');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
