const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  homeTitle: { type: String, default: 'FATURÉ' },
  homeSubtitle: { type: String, default: 'Aroma elegan untuk setiap kesan yang tak terlupakan' },
  homeAboutText: { type: String, default: 'Di Faturé, kami percaya bahwa parfum bukan sekadar aroma, melainkan identitas. Kami meracik setiap tetesan esensi dengan bahan premium pilihan untuk memastikan kesan mewah dan tahan lama. Temukan aroma yang mewakili diri Anda.' },
  aboutTitle: { type: String, default: 'Tentang Faturé' },
  aboutTagline: { type: String, default: 'Mendefinisikan Elegansi dalam Setiap Tetesan' },
  aboutVisionTitle: { type: String, default: 'Visi Kami' },
  aboutVisionText: { type: String, default: 'Faturé lahir dari keyakinan bahwa parfum adalah mahkota penutup penampilan Anda. Kami menghadirkan racikan aroma premium yang dirancang untuk memberikan kesan mendalam dan abadi.\n\nDengan bahan-bahan selektif dan proses penyulingan teliti, setiap botol Faturé adalah karya seni aromatik yang siap menemani perjalanan hidup Anda—dari momen santai hingga malam penuh glamor.' }
});

module.exports = mongoose.model('Setting', schema);