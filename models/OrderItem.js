const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Ditambah ref
  quantity: Number,
  price: Number,
  subtotal: Number
});

module.exports = mongoose.model('order_items', schema);