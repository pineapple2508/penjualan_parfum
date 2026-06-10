require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const app = express();
app.set('trust proxy', 1);
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fature-store',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

const upload = multer({ storage });
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false,
  
store: MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions'
}),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));
app.use(flash());

app.use((req, res, next) => { 
  res.locals.session = req.session; 
  res.locals.user = req.session.user || null; 
  next(); 
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parfum_store';
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000
})
.then(() => {
  console.log('MongoDB Connected');
})
.catch((err) => {
  console.error('MongoDB Error:', err);
});
mongoose.connection.on('connected', () => {
  console.log('MongoDB Atlas Connected');
});
mongoose.connection.on('error', (err) => {
  console.log('MongoDB Error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Disconnected');
});

const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
const User = require('./models/User');
const Setting = require('./models/Setting'); 

const isLogin = (req, res, next) => { 
  if (!req.session.user) { 
    req.flash('error', 'Silakan login terlebih dahulu!'); 
    return res.redirect('/login'); 
  } 
  next(); 
};

const isAdmin = (req, res, next) => { 
  if (req.session.user && req.session.user.role === 'admin') { 
    next(); 
  } else { 
    res.send('Akses ditolak! Halaman ini khusus Admin.'); 
  } 
};

const getOngkir = (service) => { 
  if (service === 'JNE Reguler') return 20000; 
  if (service === 'J&T Express') return 18000; 
  if (service === 'SiCepat BEST') return 25000; 
  return 0; 
};

// ==========================================
// ROUTES PUBLIK
// ==========================================
app.get('/', async (req, res) => { 
  const products = await Product.find(); 
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({}); 
  res.render('index', { title: 'Faturé Store', products, settings }); 
});

app.get('/products', async (req, res) => { 
  const products = await Product.find(); 
  res.render('products', { title: 'Katalog Produk', products }); 
});

app.get('/about', async (req, res) => { 
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({});
  res.render('about', { title: 'Tentang Kami', settings }); 
});

// ==========================================
// ROUTES CUSTOMER
// ==========================================
app.get('/orders/add/:productId', isLogin, async (req, res) => { 
  const product = await Product.findById(req.params.productId); 
  if (!product) return res.send('Tidak ditemukan'); 
  res.render('add_order', { title: 'Buat Pesanan', product }); 
});

app.post('/orders/save', isLogin, async (req, res) => {
  try {
    const { product_id, quantity, customer_name, customer_email, customer_phone, customer_address, order_date, payment_method, shipping_service } = req.body;
    const product = await Product.findById(product_id); 
    if (!product) return res.send('Produk tidak ditemukan');
    const shipping_cost = getOngkir(shipping_service);
    const total_price = (product.price * Number(quantity)) + shipping_cost;
    let status = 'Menunggu Pembayaran'; 
    if (payment_method === 'COD') status = 'Diproses';
    const newOrder = new Order({ user_id: req.session.user._id, customer_name, customer_email, customer_phone, customer_address, order_date, total_price, shipping_service, shipping_cost, payment_method, status });
    await newOrder.save();
    const newItem = new OrderItem({ order_id: newOrder._id, product_id: product._id, quantity: Number(quantity), price: product.price, subtotal: product.price * Number(quantity) });
    await newItem.save();
    await Customer.findOneAndUpdate({ user_id: req.session.user._id }, { user_id: req.session.user._id, name: customer_name, email: customer_email, phone: customer_phone, address: customer_address }, { upsert: true, new: true });
    product.stock -= Number(quantity); 
    await product.save();
    res.redirect('/payment-instruction/' + newOrder._id);
  } catch (err) { 
    console.log(err); 
    res.send('Gagal menyimpan pesanan'); 
  }
});

app.post('/cart/add', isLogin, async (req, res) => { 
  const { product_id, quantity } = req.body; 
  const product = await Product.findById(product_id); 
  if (!product) return res.send('Tidak ditemukan'); 
  if (!req.session.cart) req.session.cart = []; 
  const existingItem = req.session.cart.find(item => item.productId == product_id); 
  if (existingItem) { existingItem.quantity += Number(quantity); } 
  else { req.session.cart.push({ productId: product._id, name: product.name, price: product.price, quantity: Number(quantity) }); } 
  req.flash('success', `${product.name} dimasukkan ke keranjang!`); 
  res.redirect('/cart'); 
});

app.get('/cart', isLogin, (req, res) => { 
  const cart = req.session.cart || []; 
  res.render('cart', { title: 'Keranjang Belanja', cart, success: req.flash('success') }); 
});

app.get('/cart/remove/:id', isLogin, (req, res) => { 
  req.session.cart = req.session.cart.filter(item => item.productId != req.params.id); 
  res.redirect('/cart'); 
});

app.post('/checkout', isLogin, async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, customer_address, order_date, payment_method, shipping_service } = req.body;
    const cart = req.session.cart || []; 
    if (cart.length === 0) return res.send('Keranjang kosong!');
    const shipping_cost = getOngkir(shipping_service); 
    let sub_total = 0; 
    cart.forEach(item => { sub_total += item.price * item.quantity; }); 
    const total_price = sub_total + shipping_cost;
    let status = 'Menunggu Pembayaran'; 
    if (payment_method === 'COD') status = 'Diproses';
    const newOrder = new Order({ user_id: req.session.user._id, customer_name, customer_email, customer_phone, customer_address, order_date, total_price, shipping_service, shipping_cost, payment_method, status });
    await newOrder.save();
    for (let item of cart) { 
      const newItem = new OrderItem({ order_id: newOrder._id, product_id: item.productId, quantity: item.quantity, price: item.price, subtotal: item.price * item.quantity }); 
      await newItem.save(); 
    }
    await Customer.findOneAndUpdate({ user_id: req.session.user._id }, { user_id: req.session.user._id, name: customer_name, email: customer_email, phone: customer_phone, address: customer_address }, { upsert: true, new: true });
    for (let item of cart) { await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }); }
    req.session.cart = [];
    res.redirect('/payment-instruction/' + newOrder._id);
  } catch (err) { 
    console.log(err); 
    res.send('Gagal checkout'); 
  }
});

app.get('/payment-instruction/:id', isLogin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (
      !order ||
      order.user_id.toString() !== req.session.user._id.toString()
    ) {
      return res.send('Pesanan tidak ditemukan');
    }
    res.render('payment_instruction', {
      title: 'Instruksi Pembayaran',
      order
    });
  } catch (err) {
    console.log(err);
    res.send('Terjadi kesalahan');
  }
});

app.post('/orders/confirm-payment/:id', isLogin, upload.single('payment_proof'), async (req, res) => { 
  try { 
    if (!req.file) return res.send('Harap unggah bukti pembayaran!'); 
    await Order.findByIdAndUpdate(req.params.id, { status: 'Menunggu Konfirmasi', payment_proof: '/uploads/' + req.file.filename }); 
    req.flash('success', 'Bukti pembayaran berhasil dikirim!'); 
    res.redirect('/my-orders'); 
  } catch (err) { 
    console.log(err); 
    res.send('Gagal konfirmasi'); 
  } 
});

app.get('/my-orders', isLogin, async (req, res) => { 
  const orders = await Order.find({ user_id: req.session.user._id }); 
  res.render('my_orders', { title: 'Pesanan Saya', data: orders, success: req.flash('success') }); 
});

// ==========================================
// ROUTES ADMIN
// ==========================================
app.get('/admin/products', isLogin, isAdmin, async (req, res) => { 
  const products = await Product.find(); 
  res.render('admin_products', { title: 'Kelola Produk', data: products }); 
});

app.get('/products/add', isLogin, isAdmin, (req, res) => { 
  res.render('add_products', { title: 'Tambah Produk' }); 
});

app.post('/products/add', isLogin, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, price, stock, description } = req.body;

    const image = req.file
      ? req.file.path
      : 'https://via.placeholder.com/300x300.png?text=No+Image';
    
    console.log('FILE:', req.file);
    await Product.create({
      name,
      price,
      stock,
      description,
      image
    });
    res.redirect('/admin/products');
  } 
  catch (err) {
    console.log('ERROR PRODUCT:', err);
    res.status(500).send(err.message);
  }
});
app.get('/products/delete/:id', isLogin, isAdmin, async (req, res) => { 
  await Product.findByIdAndDelete(req.params.id); 
  res.redirect('/admin/products'); 
});

app.get('/products/edit/:id', isLogin, isAdmin, async (req, res) => { 
  const data = await Product.findById(req.params.id); 
  res.render('edit_product', { data, title: 'Edit Produk' }); 
});

app.post('/products/update/:id', isLogin, isAdmin, upload.single('image'), async (req, res) => { 
  try {
    const { name, price, stock, description } = req.body; 
    const updateData = { name, price, stock, description };
    
    if (req.file) {
    updateData.image = req.file.path;
    }

    await Product.findByIdAndUpdate(req.params.id, updateData); 
    res.redirect('/admin/products'); 
  } catch (err) {
    console.log(err);
    res.send('Gagal update produk');
  }
});

app.get('/customers', isLogin, isAdmin, async (req, res) => { 
  const data = await Customer.find(); 
  res.render('customers', { data, title: 'Customer' }); 
});

app.get('/orders', isLogin, isAdmin, async (req, res) => { 
  try { 
    const ordersRaw = await Order.find().sort({ order_date: -1 }).lean(); 
    const orders = []; 
    
    for (let order of ordersRaw) { 
      const itemsRaw = await OrderItem.find({ order_id: order._id }).lean(); 
      const itemsData = [];
      for (let item of itemsRaw) {
        let productName = 'Produk Dihapus';
        if (item.product_id) {
          try { 
            const product = await Product.findById(item.product_id); 
            if (product) productName = product.name; 
          } catch (e) {}
        }
        itemsData.push({ ...item, product_id: item.product_id ? { name: productName } : null });
      }
      order.itemsData = itemsData; 
      orders.push(order); 
    } 
    
    res.render('orders', { title: 'Data Order', data: orders }); 
  } catch (err) { 
    console.log("Detail Error Order:", err); 
    res.status(500).send("Error mengambil data order"); 
  } 
});

app.post('/orders/update-status/:id', isLogin, isAdmin, async (req, res) => { 
  const { status } = req.body; 
  await Order.findByIdAndUpdate(req.params.id, { status }); 
  res.redirect('/orders'); 
});

app.get('/users', isLogin, isAdmin, async (req, res) => { 
  const data = await User.find(); 
  res.render('users', { data, title: 'User' }); 
});

app.get('/admin/settings', isLogin, isAdmin, async (req, res) => {
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({});
  res.render('admin_settings', { title: 'Pengaturan Web', settings });
});

app.post('/admin/settings', isLogin, isAdmin, upload.single('bannerImage'), async (req, res) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    console.log("FILE:", req.file);
    if (req.file) {
      settings.bannerImage = req.file.path;
    }
    await settings.save();
    console.log("BANNER:", settings.bannerImage);
    req.flash('success', 'Pengaturan berhasil disimpan!');
    res.redirect('/admin/settings');
  } 
  catch(err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// ==========================================
// AUTH
// ==========================================
app.get('/login', (req, res) => { 
  res.render('login', { title: 'Login', error: req.flash('error'), success: req.flash('success') }); 
});

app.post('/login', async (req, res) => {
  try {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      req.flash('error', 'Username tidak ditemukan!');
      return res.redirect('/login');
    }

    if (!user.isVerified) {
    req.flash('error', 'Akun belum diverifikasi');
    return res.redirect('/login');
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash('error', 'Password salah!');
      return res.redirect('/login');
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      role: user.role
    };

    req.session.save((err) => {

      if (err) {
        console.log(err);
        req.flash('error', 'Gagal membuat session');
        return res.redirect('/login');
      }

      return res.redirect('/');
    });

  } catch (err) {

    console.log(err);
    req.flash('error', 'Terjadi kesalahan saat login');
    res.redirect('/login');

  }
});

app.get('/register', (req, res) => { 
  res.render('register', { title: 'Register', error: req.flash('error') }); 
});

app.post('/register', async (req, res) => {
  try {

    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      req.flash('error', 'Password tidak cocok!');
      return res.redirect('/register');
    }

   const existingUser = await User.findOne({
  username
});

if (existingUser) {
  req.flash('error', 'Username sudah digunakan!');
  return res.redirect('/register');
}

const existingEmail = await User.findOne({
  email,
  isVerified: true
});

if (existingEmail) {
  req.flash('error', 'Email sudah digunakan!');
  return res.redirect('/register');
}
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpires = new Date(
      Date.now() + 5 * 60 * 1000
    );

    const newUser = await User.findOneAndUpdate(
  { email },
  {
    username,
    email,
    password: hashedPassword,
    role: 'customer',
    isVerified: false,
    otp,
    otpExpires
  },
  {
    upsert: true,
    new: true
  }
);
    await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: email,
  subject: 'Kode OTP Verifikasi Akun FATURÉ',
  html: `
    <h2>Verifikasi Akun FATURÉ</h2>
    <p>Kode OTP Anda:</p>
    <h1>${otp}</h1>
    <p>Berlaku selama 5 menit.</p>
  `
});

    console.log("OTP:", otp);

    req.session.pendingUser = newUser._id;

    res.redirect('/verify-otp');

  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

// ROUTE HALAMAN OTP
app.get('/verify-otp', (req, res) => {
  res.render('verify_otp', {
    error: req.flash('error')
  });
});

// ROUTE VERIFIKASI OTP
app.post('/verify-otp', async (req, res) => {
  try {

    const { otp } = req.body;

    if (!req.session.pendingUser) {
      req.flash('error', 'Session OTP tidak ditemukan');
      return res.redirect('/register');
    }

    const user = await User.findById(
      req.session.pendingUser
    );

    if (!user) {
      req.flash('error', 'User tidak ditemukan');
      return res.redirect('/register');
    }

    if (user.otp !== otp) {
      req.flash('error', 'OTP salah');
      return res.redirect('/verify-otp');
    }

    if (user.otpExpires < new Date()) {
      req.flash('error', 'OTP sudah kadaluarsa');
      return res.redirect('/verify-otp');
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    delete req.session.pendingUser;

    req.flash('success', 'Registrasi berhasil');

    res.redirect('/login');

  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

app.get('/logout', (req, res) => { 
  req.session.destroy((err) => { 
    if (err) return res.send('Gagal logout'); 
    res.redirect('/'); 
  }); 
});

// Kode app.listen Anda yang kemarin:
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// WAJIB TAMBAHKAN BARIS INI DI PALING BAWAH FILE:
module.exports = app;
