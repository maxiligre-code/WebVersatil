const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

// Get cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) cart = new Cart({ user: req.user.id, items: [] }); await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
    await cart.populate('items.product');
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update quantity
router.put('/:itemId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ error: 'Panier non trouvé' });
    const item = cart.items.id(req.params.itemId);
    if (item) {
      item.quantity = quantity;
      if (item.quantity <= 0) cart.items.pull(item);
      await cart.save();
      await cart.populate('items.product');
      res.json(cart);
    } else {
      res.status(404).json({ error: 'Article non trouvé' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove from cart
router.delete('/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ error: 'Panier non trouvé' });
    cart.items.pull(req.params.itemId);
    await cart.save();
    await cart.populate('items.product');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkout (simulate payment)
router.post('/checkout', auth, async (req, res) => {
  try {
    // Vide le panier après paiement
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
    res.json({ success: true, message: 'Paiement validé ! Projet lancé sous 24h.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;