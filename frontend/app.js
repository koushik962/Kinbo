const API_BASE = 'https://kinbo-api-0wdb.onrender.com/api';

let allProducts = [];
let filteredProducts = [];
let selectedCategory = 'All';
let selectedPriceFilter = 'ALL';
let selectedSort = 'default';

let cart = JSON.parse(localStorage.getItem('kinbo_cart') || '[]');
let customerToken = localStorage.getItem('kinbo_user_token') || null;
let customerUser = JSON.parse(localStorage.getItem('kinbo_user_info') || 'null');
let adminToken = localStorage.getItem('kinbo_admin_token') || null;

function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.cssText =
    'position:fixed;bottom:20px;right:20px;background:#111827;color:#ffffff;padding:11px 16px;border-radius:10px;z-index:99999;font-size:14px;font-weight:500;box-shadow:0 10px 25px rgba(0,0,0,0.25);display:block;';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    el.classList.add('hidden');
    el.style.display = 'none';
  }, 2800);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setVisible(el, visible, displayType = 'block') {
  if (!el) return;
  if (visible) {
    el.classList.remove('hidden', 'hide', 'd-none');
    el.style.setProperty('display', displayType, 'important');
  } else {
    el.classList.add('hidden');
    el.style.setProperty('display', 'none', 'important');
  }
}

function saveCart() {
  localStorage.setItem('kinbo_cart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const countEl =
    document.getElementById('cartCount') ||
    document.querySelector('[data-cart-count]') ||
    document.querySelector('.cart-count');
  const totalCount = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);
  if (countEl) countEl.textContent = totalCount;

  const listEl =
    document.getElementById('cartItems') ||
    document.getElementById('cartList') ||
    document.querySelector('.cart-items');
  const subtotalEl =
    document.getElementById('cartSubtotal') ||
    document.getElementById('cartTotal') ||
    document.querySelector('.cart-subtotal');

  if (!listEl) return;

  if (!cart.length) {
    listEl.innerHTML = '<p class="empty-state">Your bag is empty. Add an item to get started.</p>';
    if (subtotalEl) subtotalEl.textContent = '৳0';
    return;
  }

  let subtotal = 0;
  listEl.innerHTML = cart
    .map((item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 1);
      subtotal += price * qty;
      return `
        <div class="cart-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #e5e7eb;">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div style="font-size:13px;opacity:0.75;">৳${price.toLocaleString()} × ${qty}</div>
          </div>
          <div class="cart-actions" style="display:flex;gap:6px;align-items:center;">
            <button type="button" data-cart-dec="${item.id}" style="padding:4px 9px;cursor:pointer;">-</button>
            <button type="button" data-cart-inc="${item.id}" style="padding:4px 9px;cursor:pointer;">+</button>
            <button type="button" data-cart-rem="${item.id}" style="padding:4px 9px;cursor:pointer;">✕</button>
          </div>
        </div>
      `;
    })
    .join('');

  if (subtotalEl) subtotalEl.textContent = `৳${subtotal.toLocaleString()}`;
}

function addToCart(productId) {
  const pid = Number(productId);
  let prod = allProducts.find((p) => Number(p.id) === pid);
  if (!prod && Array.isArray(window.products)) {
    prod = window.products.find((p) => Number(p.id) === pid);
  }
  if (!prod) {
    showToast('Product not found. Please refresh.');
    return;
  }

  const existing = cart.find((item) => Number(item.id) === pid);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: prod.id,
      title: prod.title,
      price: Number(prod.price),
      qty: 1,
    });
  }
  saveCart();
  showToast(`${prod.title} added to bag`);
}

function changeQty(productId, delta) {
  const pid = Number(productId);
  const item = cart.find((i) => Number(i.id) === pid);
  if (!item) return;
  item.qty += Number(delta);
  if (item.qty <= 0) {
    cart = cart.filter((i) => Number(i.id) !== pid);
  }
  saveCart();
}

function removeFromCart(productId) {
  const pid = Number(productId);
  cart = cart.filter((i) => Number(i.id) !== pid);
  saveCart();
}

function ensureFilterControls() {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid || !grid.parentNode || document.getElementById('kinboFilterBar')) return;

  const bar = document.createElement('div');
  bar.id = 'kinboFilterBar';
  bar.style.cssText =
    'display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:14px 0 18px;padding:12px 14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;color:#111827;';

  bar.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
      <strong style="font-size:13px;">Filter:</strong>
      <select id="priceFilterSelect" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#111827;">
        <option value="ALL">All Prices</option>
        <option value="UNDER_1500">Under ৳1,500</option>
        <option value="1500_2500">৳1,500 – ৳2,500</option>
        <option value="ABOVE_2500">Above ৳2,500</option>
      </select>
      <select id="sortSelect" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#111827;">
        <option value="default">Sort: Featured</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="name_asc">Name: A to Z</option>
      </select>
      <button type="button" id="resetFiltersBtn" style="padding:7px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#111827;cursor:pointer;font-size:13px;">
        Reset
      </button>
    </div>
    <div id="productCountLabel" style="font-size:13px;font-weight:600;color:#374151;"></div>
  `;

  grid.parentNode.insertBefore(bar, grid);

  document.getElementById('priceFilterSelect')?.addEventListener('change', (e) => {
    selectedPriceFilter = e.target.value;
    applyClientFiltersAndRender();
  });

  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    selectedSort = e.target.value;
    applyClientFiltersAndRender();
  });

  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    selectedCategory = 'All';
    selectedPriceFilter = 'ALL';
    selectedSort = 'default';
    document.querySelectorAll('.cat-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0 || btn.dataset.category === 'All');
    });
    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.value = '';
    const priceEl = document.getElementById('priceFilterSelect');
    const sortEl = document.getElementById('sortSelect');
    if (priceEl) priceEl.value = 'ALL';
    if (sortEl) sortEl.value = 'default';
    fetchProducts();
  });
}

function applyClientFiltersAndRender() {
  let list = [...allProducts];

  if (selectedPriceFilter === 'UNDER_1500') {
    list = list.filter((p) => Number(p.price) < 1500);
  } else if (selectedPriceFilter === '1500_2500') {
    list = list.filter((p) => Number(p.price) >= 1500 && Number(p.price) <= 2500);
  } else if (selectedPriceFilter === 'ABOVE_2500') {
    list = list.filter((p) => Number(p.price) > 2500);
  }

  if (selectedSort === 'price_asc') {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (selectedSort === 'price_desc') {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (selectedSort === 'name_asc') {
    list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  }

  filteredProducts = list;
  const countLabel = document.getElementById('productCountLabel');
  if (countLabel) {
    countLabel.textContent = `${filteredProducts.length} of ${allProducts.length} items shown`;
  }
  renderProducts(filteredProducts);
}

function renderProducts(list) {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = '<p class="empty-state">No products matched your filter.</p>';
    return;
  }

  grid.innerHTML = list
    .map((p, idx) => {
      const featuredClass =
        idx === 0 && selectedSort === 'default' && selectedPriceFilter === 'ALL' ? 'bento-featured' : '';
      return `
        <article class="product-card ${featuredClass}">
          <div class="product-img-wrap">
            ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ''}
            <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" />
          </div>
          <div class="product-body">
            <span class="product-cat">${escapeHtml(p.category)}</span>
            <h3>${escapeHtml(p.title)}</h3>
            <p class="product-desc">${escapeHtml(p.description)}</p>
            <div class="product-foot">
              <span class="price">৳${Number(p.price).toLocaleString()}</span>
              <button type="button" class="btn-primary add-to-bag-btn" data-add-product="${p.id}">Add to Bag</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

async function fetchProducts() {
  ensureFilterControls();
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (grid && !allProducts.length) {
    grid.innerHTML = '<p class="empty-state">Loading kinbo drops...</p>';
  }

  try {
    const searchVal = document.getElementById('searchInput')?.value.trim() || '';
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'All') {
      params.set('category', selectedCategory);
    }
    if (searchVal) {
      params.set('search', searchVal);
    }

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/products${queryStr}`);
    if (!res.ok) throw new Error('Failed to load products');
    allProducts = await res.json();
    window.products = allProducts;
    applyClientFiltersAndRender();
  } catch (err) {
    if (grid) {
      grid.innerHTML = '<p class="empty-state">Could not connect to backend API. Please try again in a moment.</p>';
    }
  }
}

function getAdminSectionElement() {
  return (
    document.getElementById('adminSection') ||
    document.getElementById('adminPanel') ||
    document.getElementById('adminView') ||
    document.getElementById('adminDashboard') ||
    document.querySelector('[data-admin-panel], [data-admin-section], .admin-panel, .admin-section')
  );
}

function getStorefrontElements() {
  const explicit =
    document.getElementById('storefrontSection') ||
    document.getElementById('mainStorefront') ||
    document.getElementById('storefront');
  if (explicit) return [explicit];

  const adminSec = getAdminSectionElement();
  const candidates = Array.from(document.querySelectorAll('main, section'));
  return candidates.filter((el) => {
    if (!el || el === adminSec) return false;
    if (adminSec && (el.contains(adminSec) || adminSec.contains(el))) return false;
    const idLower = (el.id || '').toLowerCase();
    const clsLower = (el.className || '').toString().toLowerCase();
    if (idLower.includes('modal') || clsLower.includes('modal')) return false;
    return true;
  });
}

function closeAllModals() {
  const modalSelectors = [
    '#adminLoginModal',
    '#adminModal',
    '#authModal',
    '#loginModal',
    '[data-admin-modal]',
    '.modal',
  ];
  document.querySelectorAll(modalSelectors.join(',')).forEach((m) => {
    if (m.id === 'cartDrawer') return;
    setVisible(m, false);
  });
}

function openMainStorefront() {
  const adminSec = getAdminSectionElement();
  setVisible(adminSec, false);

  getStorefrontElements().forEach((el) => {
    setVisible(el, true, '');
  });

  fetchProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Returned to Kinbo Storefront');
}

function ensureBackToStoreButton(adminSec) {
  if (!adminSec || document.getElementById('backToStoreBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'backToStoreBtn';
  btn.type = 'button';
  btn.textContent = '← Back to Main Store';
  btn.style.cssText =
    'padding:10px 16px;border-radius:10px;border:1px solid #374151;background:#111827;color:#ffffff;font-weight:600;cursor:pointer;margin:0 0 16px 0;display:inline-flex;align-items:center;gap:6px;position:relative;z-index:20;';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openMainStorefront();
  });

  adminSec.prepend(btn);
}

function openAdminPanel() {
  const adminSec = getAdminSectionElement();
  if (!adminSec) {
    showToast('Admin panel container not found');
    return;
  }

  closeAllModals();
  toggleCartDrawer(false);

  getStorefrontElements().forEach((el) => {
    setVisible(el, false);
  });

  setVisible(adminSec, true, 'block');
  ensureBackToStoreButton(adminSec);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadAdminData();
}

function toggleCartDrawer(forceOpen) {
  const drawer =
    document.getElementById('cartDrawer') ||
    document.getElementById('cartModal') ||
    document.querySelector('.cart-drawer');
  const backdrop =
    document.getElementById('drawerBackdrop') ||
    document.getElementById('cartBackdrop') ||
    document.querySelector('.drawer-backdrop');
  if (!drawer) return;

  const isHidden = drawer.classList.contains('hidden') || getComputedStyle(drawer).display === 'none';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isHidden;

  setVisible(drawer, shouldOpen, 'block');
  if (backdrop) {
    setVisible(backdrop, shouldOpen, 'block');
  }
  if (shouldOpen) {
    updateCartUI();
  }
}

async function handleCheckout(e) {
  e.preventDefault();
  if (!cart.length) {
    showToast('Your bag is empty');
    return;
  }

  const nameInput =
    document.getElementById('checkoutName') ||
    e.target.querySelector('input[name="customer_name"], input[name="name"], input[type="text"]');
  const phoneInput =
    document.getElementById('checkoutPhone') ||
    e.target.querySelector('input[name="phone"], input[type="tel"]');
  const addressInput =
    document.getElementById('checkoutAddress') ||
    e.target.querySelector('textarea[name="address"], input[name="address"], textarea');

  const customer_name = (nameInput?.value || '').trim();
  const phone = (phoneInput?.value || '').trim();
  const address = (addressInput?.value || '').trim();

  if (!customer_name || !phone || !address) {
    showToast('Please enter name, phone, and address');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name,
        phone,
        address,
        items: cart.map((i) => ({ id: i.id, quantity: i.qty })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not place order');

    cart = [];
    saveCart();
    e.target.reset();
    toggleCartDrawer(false);

    const trackInput = document.getElementById('trackCodeInput');
    if (trackInput) trackInput.value = data.order_code;
    showToast(`Order placed! Code: ${data.order_code}`);
    trackOrderByCode(data.order_code);
  } catch (err) {
    showToast(err.message || 'Order failed');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function trackOrderByCode(codeOverride) {
  const input = document.getElementById('trackCodeInput');
  const resultBox = document.getElementById('trackResult');
  const code = (codeOverride || input?.value || '').trim().toUpperCase();
  if (!code || !resultBox) return;

  setVisible(resultBox, true, 'block');
  resultBox.innerHTML = 'Checking order status...';

  try {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order not found');

    resultBox.innerHTML = `
      <div><strong>Order Code:</strong> ${escapeHtml(data.order_code)}</div>
      <div><strong>Status:</strong> ${escapeHtml(data.status)}</div>
      <div><strong>Customer:</strong> ${escapeHtml(data.customer_name)} (${escapeHtml(data.phone)})</div>
      <div><strong>Total:</strong> ৳${Number(data.total_amount).toLocaleString()}</div>
    `;
  } catch (err) {
    resultBox.innerHTML = `<span class="error-text">${escapeHtml(err.message)}</span>`;
  }
}

async function handleCustomerAuth(e, mode = 'login') {
  e.preventDefault();
  const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
  const name = document.getElementById('authName')?.value.trim() || '';
  const email = document.getElementById('authEmail')?.value.trim() || '';
  const password = document.getElementById('authPassword')?.value || '';

  const payload = mode === 'register' ? { name, email, password } : { email, password };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    customerToken = data.token;
    customerUser = data.user;
    localStorage.setItem('kinbo_user_token', customerToken);
    localStorage.setItem('kinbo_user_info', JSON.stringify(customerUser));

    const accBtn = document.getElementById('accountBtn');
    if (accBtn) accBtn.textContent = customerUser.name;
    setVisible(document.getElementById('authModal'), false);
    showToast(`Welcome, ${customerUser.name}`);
  } catch (err) {
    showToast(err.message);
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const form = e.target;
  const emailInput =
    document.getElementById('adminEmail') ||
    form.querySelector('input[type="email"], input[name="email"]');
  const passInput =
    document.getElementById('adminPassword') ||
    form.querySelector('input[type="password"], input[name="password"]');

  const email = (emailInput?.value || '').trim();
  const password = passInput?.value || '';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.user?.role !== 'admin') {
      throw new Error(data.error || 'Invalid admin credentials');
    }
    