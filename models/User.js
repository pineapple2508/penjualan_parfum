const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, partialFilterExpression: { isVerified: true } // Index hanya berlaku untuk akun terverifikasi },
  email: { type: String, required: true, unique: true, partialFilterExpression: { isVerified: true } // Index hanya berlaku untuk akun terverifikasi },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  isVerified: { type: Boolean, default: false }, // TAMBAHAN: Status verifikasi email
  otp: String,
  otpExpires: Date
});

module.exports = mongoose.model('users', schema);
