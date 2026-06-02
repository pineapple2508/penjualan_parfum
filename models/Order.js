const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user_id: String,
  customer_name: String,
  customer_email: String,
  customer_phone: String,
  customer_address: String,
  order_date: String,
  total_price: Number,
  shipping_service: String,
  shipping_cost: Number,
  payment_method: String,
  payment_proof: String, // Menyimpan nama file foto struk/bukti transfer
  status: { type: String, default: 'Menunggu Pembayaran' }
});

module.exports = mongoose.model('Order', schema);