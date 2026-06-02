const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  isVerified: { type: Boolean, default: false }, // TAMBAHAN: Status verifikasi email
  otp: String,
  otpExpires: Date
});

module.exports = mongoose.model('users', schema);