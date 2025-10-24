const API_BASE = 'http://localhost:5000/api'; // Change par ton URL Render en prod, ex: 'https://ton-backend.onrender.com/api'
let currentUser = null;
let cart = [];
let token = localStorage.getItem('token');

// Helpers
async function apiCall(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  if (!res.ok) {
    const error = await res.json();
    throw error;
  }
  return res.json();
}

// Auth
async function register(userData) {
  const data = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  localStorage.setItem('token', data.token);
  currentUser = data.user;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  return data;
}

async function login(credentials) {
  const data = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  localStorage.setItem('token', data.token);
  currentUser = data.user;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  return data;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  currentUser = null;
  cart = [];
  updateCartCount();
  window.location.href = 'index.html';
}

// Load user on init
async function loadUser() {
  token = localStorage.getItem('token');
  if (token) {
    try {
      currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
      if (currentUser) {
        // Optionnel : Vérifier token avec /auth/verify si backend le supporte
      } else {
        logout();
      }
    } catch {
      logout();
    }
  }
}

// Products
async function loadProducts() {
  return await apiCall('/products');
}

// Cart
async function loadCart() {
  if (!currentUser) return { items: [] };
  const data = await apiCall('/cart');
  return data;
}

async function addToCart(productId, quantity = 1) {
  if (!currentUser) throw new Error('Connectez-vous pour ajouter au panier');
  await apiCall('/cart/add', { method: 'POST', body: JSON.stringify({ productId, quantity }) });
  cart = await loadCart();
  updateCartCount();
}

async function removeFromCart(itemId) {
  await apiCall(`/cart/${itemId}`, { method: 'DELETE' });
  cart = await loadCart();
  renderCart();
  updateCartCount();
}

async function updateQuantity(itemId, quantity) {
  if (quantity <= 0) {
    await removeFromCart(itemId);
  } else {
    await apiCall(`/cart/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
  }
  cart = await loadCart();
  renderCart();
  updateCartCount();
}

async function checkout() {
  if (!currentUser) throw new Error('Connectez-vous pour payer');
  await apiCall('/cart/checkout', { method: 'POST' });
  cart = { items: [] };
  updateCartCount();
  alert('Paiement réussi ! Nous vous contactons sous 24h pour démarrer votre projet.');
  window.location.href = 'index.html';
}

// Admin : Ajout produit
async function addProduct(productData) {
  if (currentUser?.role !== 'admin') throw new Error('Accès admin requis');
  return await apiCall('/products', { method: 'POST', body: JSON.stringify(productData) });
}

// Render functions
async function renderShop() {
  try {
    const products = await loadProducts();
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = products.map(product => `
        <div class="product-card">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="price">${product.price.toLocaleString()} €</div>
          <button class="add-to-cart" onclick="addToCart('${product._id}')">
            <i class="fas fa-cart-plus"></i> Ajouter au Panier
          </button>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Erreur chargement produits:', err);
    alert('Erreur de chargement de la boutique. Vérifiez la connexion.');
  }
}

async function renderCart() {
  if (!currentUser) {
    const itemsEl = document.getElementById('cart-items');
    if (itemsEl) {
      itemsEl.innerHTML = '<p style="text-align: center; color: #5a6c7d;">Connectez-vous pour voir votre panier. <a href="auth.html">Se connecter</a></p>';
    }
    document.getElementById('checkout-btn').style.display = 'none';
    return;
  }
  try {
    cart = await loadCart();
    const itemsEl = document.getElementById('cart-items');
    if (itemsEl) {
      if (cart.items.length === 0) {
        itemsEl.innerHTML = '<p style="text-align: center; color: #5a6c7d;">Votre panier est vide. <a href="shop.html">Découvrez la boutique</a></p>';
        document.getElementById('checkout-btn').style.display = 'none';
      } else {
        itemsEl.innerHTML = cart.items.map(item => `
          <div class="cart-item">
            <div class="cart-item-details">
              <h4>${item.product.name}</h4>
              <p>${item.product.description}</p>
              <p>${item.product.price.toLocaleString()} € / unité</p>
            </div>
            <div class="quantity-controls">
              <button class="quantity-btn" onclick="updateQuantity('${item._id}', ${item.quantity - 1})">-</button>
              <span style="min-width: 20px; text-align: center;">${item.quantity}</span>
              <button class="quantity-btn" onclick="updateQuantity('${item._id}', ${item.quantity + 1})">+</button>
              <br><button class="remove-item" onclick="removeFromCart('${item._id}')"><i class="fas fa-trash"></i> Supprimer</button>
            </div>
          </div>
        `).join('');
        const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        document.getElementById('cart-total').textContent = total.toLocaleString() + ' €';
        document.getElementById('checkout-btn').style.display = 'inline-block';
        document.getElementById('checkout-btn').onclick = checkout;
      }
    }
  } catch (err) {
    console.error('Erreur chargement panier:', err);
    alert('Erreur de chargement du panier.');
  }
  updateCartCount();
}

function updateCartCount() {
  const count = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// Account rendering
function renderAccount() {
  const profileSection = document.getElementById('profile-section');
  const accountContent = document.getElementById('account-content');
  if (currentUser) {
    document.getElementById('profile-name').textContent = currentUser.name || 'Non spécifié';
    document.getElementById('profile-email').textContent = currentUser.email;
    if (profileSection) profileSection.style.display = 'block';
    if (accountContent) accountContent.style.display = 'none';
    // Affiche lien déconnexion
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) logoutLink.style.display = 'list-item';
  } else {
    if (profileSection) profileSection.style.display = 'none';
    if (accountContent) accountContent.style.display = 'block';
  }
}

// Admin protection
function checkAdminAccess() {
  const adminSection = document.getElementById('admin-section');
  const adminRedirect = document.getElementById('admin-redirect');
  if (currentUser && currentUser.role === 'admin') {
    if (adminSection) adminSection.style.display = 'block';
    if (adminRedirect) adminRedirect.style.display = 'none';
  } else {
    if (adminSection) adminSection.style.display = 'none';
    if (adminRedirect) adminRedirect.style.display = 'block';
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  renderAccount();
  checkAdminAccess();
  if (document.querySelector('.shop')) await renderShop();
  if (document.querySelector('.cart')) await renderCart();
  updateCartCount();

  // Auth tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  if (tabBtns.length > 0) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const tab = e.target.textContent.toLowerCase().includes('inscription') ? 'register' : 'login';
        document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
      });
    });
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await login({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        });
        window.location.href = 'account.html';
      } catch (err) {
        const msgEl = document.getElementById('auth-message');
        if (msgEl) msgEl.innerHTML = `<p style="color: red;">${err.error || err.message}</p>`;
      }
    };
  }

  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await register({
          name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value
        });
        window.location.href = 'account.html';
      } catch (err) {
        const msgEl = document.getElementById('auth-message');
        if (msgEl) msgEl.innerHTML = `<p style="color: red;">${err.error || err.message}</p>`;
      }
    };
  }

  // Logout links
  document.querySelectorAll('#logout-link a, .logout').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });

  // Edit profile (démo)
  window.editProfile = () => {
    alert('Édition de profil : Pour une version complète, intégrez un backend avancé.');
  };

  // Admin form - Soumission directe via API
  const adminForm = document.getElementById('admin-form');
  if (adminForm) {
    adminForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        if (!currentUser || currentUser.role !== 'admin') {
          alert('Accès admin requis. Connectez-vous en tant qu\'admin.');
          return;
        }

        const productData = {
          name: document.getElementById('product-name').value,
          price: parseFloat(document.getElementById('product-price').value),
          description: document.getElementById('product-desc').value
        };

        if (!productData.name || !productData.price || !productData.description) {
          throw new Error('Tous les champs sont requis.');
        }

        const newProduct = await addProduct(productData);

        alert(`Produit "${productData.name}" ajouté avec succès ! ID: ${newProduct._id}`);
        const outputEl = document.getElementById('json-output');
        if (outputEl) {
          outputEl.style.display = 'block';
          document.getElementById('json-text').textContent = JSON.stringify(newProduct, null, 2);
        }

        adminForm.reset();
      } catch (err) {
        alert(`Erreur lors de l'ajout : ${err.error || err.message}`);
      }
    };
  }

  // Payment form
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        // Validation basique
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        if (!name || !email) throw new Error('Remplissez nom et email.');

        // Simule envoi infos paiement (en prod, intègre Stripe)
        await checkout();

        // Cache formulaire, montre succès
        paymentForm.style.display = 'none';
        document.getElementById('payment-success').style.display = 'block';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Mobile nav
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }
});