const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: String,
  brand: String,
  category: String,
  price: Number,
  stock: Number,
  description: String,
  image: { type: String, default: '/uploads/default-perfume.png' }, // Field baru untuk foto produk
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('products', schema);