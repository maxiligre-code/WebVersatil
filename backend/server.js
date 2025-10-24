require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI; // Remplace par ton URI Atlas

// Middleware
app.use(cors({ origin: '*' })); // Pour GitHub Pages ; restreins en prod
app.use(express.json());

// Connexion DB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur DB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// Créer admin par défaut (run une fois)
const createAdmin = async () => {
  const User = require('./models/User');
  const adminExists = await User.findOne({ email: 'admin@webversatil.com' });
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('admin123', 10);
    await new User({ email: 'admin@webversatil.com', password: hashed, name: 'Admin', role: 'admin' }).save();
    console.log('👑 Admin créé : admin@webversatil.com / admin123');
  }
};
createAdmin();

app.listen(PORT, () => console.log(`🚀 Backend sur http://localhost:${PORT}`));
