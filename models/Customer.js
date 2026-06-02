const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user_id: String, // Penghubung ke User login
  name: String,
  email: String,
  phone: String,
  address: String
});

module.exports = mongoose.model('Customers', schema);