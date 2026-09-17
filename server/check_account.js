const mongoose = require('mongoose');
const Student = require('./models/Student');
require('dotenv').config();

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to:', process.env.MONGO_URI);
    
    const email = 'krishnanbaby777@gmail.com';
    console.log('\nSearching for account:', email);
    
    const student = await Student.findOne({ email: email.trim().toLowerCase() });
    
    if (!student) {
      console.log('✗ Account NOT found in database');
      process.exit(1);
    }
    
    console.log('✓ Account found');
    console.log('\n=== ACCOUNT STATUS ===');
    console.log('Email exists:', student.email ? 'YES' : 'NO');
    console.log('Email (normalized):', student.email);
    console.log('Role:', student.role || 'NOT SET');
    console.log('Active status:', student.isActive);
    console.log('Email verification required:', student.emailVerificationRequired);
    console.log('Email verified:', student.isVerified);
    console.log('Password hash exists:', student.password ? 'YES' : 'NO');
    console.log('Password hash length:', student.password ? student.password.length : 0);
    console.log('Created at:', student.createdAt);
    console.log('Updated at:', student.updatedAt);
    
    // Test password verification without printing the actual password
    const bcrypt = require('bcryptjs');
    
    // For testing, we'll try a known password hash format check
    console.log('\n=== PASSWORD HASH CHECK ===');
    console.log('Hash starts with:', student.password ? student.password.substring(0, 10) : 'N/A');
    console.log('Hash appears to be bcrypt:', student.password && student.password.startsWith('$2') ? 'YES' : 'NO/UNKNOWN');
    
    console.log('\n=== PROFILE STATUS ===');
    console.log('Profile completed:', student.profileCompleted);
    console.log('Initial assessment completed:', student.initialAssessmentCompleted);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
