const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-placement-platform');
    console.log('Connected to MongoDB');

    // Update admin email verification
    const admin = await Admin.updateOne(
      { email: 'admin@example.com' },
      { emailVerificationRequired: false }
    );

    console.log('Updated admin verification:', admin.modifiedCount > 0 ? 'YES' : 'NO');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
