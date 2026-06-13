const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpires: Date
});

// MEMBUAT PARTIAL UNIQUE INDEX (CARA RESMI MONGOOSE)
// Index hanya akan melarang duplikat untuk akun yang isVerified-nya true
// Akun yang isVerified-nya false/null/undefined boleh duplikat
schema.index({ username: 1 }, { 
  unique: true, 
  partialFilterExpression: { isVerified: true } 
});

schema.index({ email: 1 }, { 
  unique: true, 
  partialFilterExpression: { isVerified: true } 
});

module.exports = mongoose.model('users', schema);
