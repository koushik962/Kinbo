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
    el.style.cssText =
      'position:fixed;bottom:20px;right:20px;background:#111827;color:#fff;padding:10px 16px;border-radius:10px;z-index:9999;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.22);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    el.classList.add('hidden');
    el.style.display = 'none';
  }, 2600);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    listEl.innerHTML = '<p class="empty-state">Your bag is empty. Add a youth drop to get started.</p>';
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
          <div class="cart-actions" style="display:flex;gap:6px;">
            <button type="button" onclick="changeQty(${item.id}, -1)">-</button>
            <button type="button" onclick="changeQty(${item.id}, 1)">+</button>
            <button type="button" onclick="removeFromCart(${item.id})">✕</button>
          </div>
        </div>
      `;
    })
    .join('');

  if (subtotalEl) subtotalEl.textContent = `৳${subtotal.toLocaleString()}`;
}

function addToCart(productId) {
  const prod = allProducts.find((p) => Number(p.id) === Number(productId));
  if (!prod) {
    showToast('Product not found');
    return;
  }

  const existing = cart.find((item) => Number(item.id) === Number(productId));
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
  const item = cart.find((i) => Number(i.id) === Number(productId));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => Number(i.id) !== Number(productId));
  }
  saveCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => Number(i.id) !== Number(productId));
  saveCart();
}

function ensureFilterControls() {
  const grid = document.getElementById('productGrid') || document.querySelector('.product-grid');
  if (!grid || document.getElementById('kinboFilterBar')) return;

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
              <button type="button" class="btn-primary" onclick="addToCart(${p.id})">Add to Bag</button>
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
    document.querySelector('[data-admin-panel]')
  );
}

function getStorefrontElements() {
  const explicit =
    document.getElementById('storefrontSection') ||
    document.getElementById('mainStorefront') ||
    document.getElementById('storefront');
  if (explicit) return [explicit];

  const adminSec = getAdminSectionElement();
  const mains = Array.from(document.querySelectorAll('main, section'));
  return mains.filter((el) => el !== adminSec && !el.contains(adminSec));
}

function openMainStorefront() {
  const adminSec = getAdminSectionElement();
  if (adminSec) {
    adminSec.classList.add('hidden');
    adminSec.style.display = 'none';
  }

  getStorefrontElements().forEach((el) => {
    el.classList.remove('hidden');
    el.style.display = '';
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
    'padding:10px 16px;border-radius:10px;border:1px solid #374151;background:#111827;color:#ffffff;font-weight:600;cursor:pointer;margin:0 0 16px 0;display:inline-flex;align-items:center;gap:6px;';
  btn.addEventListener('click', openMainStorefront);

  adminSec.prepend(btn);
}

function openAdminPanel() {
  const adminSec = getAdminSectionElement();
  if (!adminSec) {
    showToast('Admin panel container not found');
    return;
  }

  getStorefrontElements().forEach((el) => {
    el.classList.add('hidden');
    el.style.display = 'none';
  });

  adminSec.classList.remove('hidden');
  adminSec.style.display = 'block';
  ensureBackToStoreButton(adminSec);
  loadAdminData();
}

function toggleCartDrawer(forceOpen) {
  const drawer = document.getElementById('cartDrawer') || document.querySelector('.cart-drawer');
  const backdrop = document.getElementById('drawerBackdrop') || document.querySelector('.drawer-backdrop');
  if (!drawer) return;

  const isCurrentlyHidden = drawer.classList.contains('hidden') || getComputedStyle(drawer).display === 'none';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isCurrentlyHidden;

  drawer.classList.toggle('hidden', !shouldOpen);
  drawer.style.display = shouldOpen ? 'block' : 'none';
  if (backdrop) {
    backdrop.classList.toggle('hidden', !shouldOpen);
    backdrop.style.display = shouldOpen ? 'block' : 'none';
  }
}

async function handleCheckout(e) {
  e.preventDefault();
  if (!cart.length) {
    showToast('Your bag is empty');
    return;
  }

  const customer_name = document.getElementById('checkoutName')?.value.trim() || '';
  const phone = document.getElementById('checkoutPhone')?.value.trim() || '';
  const address = document.getElementById('checkoutAddress')?.value.trim() || '';

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
    if (!res.ok) throw new Error(data.error || 'Order failed');

    cart = [];
    saveCart();
    e.target.reset();
    toggleCartDrawer(false);

    const trackInput = document.getElementById('trackCodeInput');
    if (trackInput) trackInput.value = data.order_code;
    showToast(`Order placed! Code: ${data.order_code}`);
    trackOrderByCode(data.order_code);
  } catch (err) {
    showToast(err.message);
  }
}

async function trackOrderByCode(codeOverride) {
  const input = document.getElementById('trackCodeInput');
  const resultBox = document.getElementById('trackResult');
  const code = (codeOverride || input?.value || '').trim().toUpperCase();
  if (!code || !resultBox) return;

  resultBox.classList.remove('hidden');
  resultBox.style.display = 'block';
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
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    showToast(`Welcome, ${customerUser.name}`);
  } catch (err) {
    showToast(err.message);
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail')?.value.trim() || '';
  const password = document.getElementById('adminPassword')?.value || '';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.user?.role !== 'admin') {
      throw new Error('Invalid admin credentials');
    }

    adminToken = data.token;
    localStorage.setItem('kinbo_admin_token', adminToken);
    const modal =
      document.getElementById('adminLoginModal') ||
      document.getElementById('adminModal') ||
      document.querySelector('[data-admin-modal]');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    openAdminPanel();
    showToast('Admin panel unlocked');
  } catch (err) {
    showToast(err.message);
  }
}

async function loadAdminData() {
  if (!adminToken) return;
  const headers = { Authorization: `Bearer ${adminToken}` };

  try {
    const [prodRes, ordRes] = await Promise.all([
      fetch(`${API_BASE}/admin/products`, { headers }),
      fetch(`${API_BASE}/admin/orders`, { headers }),
    ]);

    if (prodRes.status === 401 || ordRes.status === 401) {
      adminToken = null;
      localStorage.removeItem('kinbo_admin_token');
      showToast('Session expired. Please log in as admin again.');
      const modal =
        document.getElementById('adminLoginModal') ||
        document.getElementById('adminModal') ||
        document.querySelector('[data-admin-modal]');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
      }
      return;
    }

    if (prodRes.ok) {
      const adminProds = await prodRes.json();
      const tbody = document.getElementById('adminProductsBody');
      if (tbody) {
        tbody.innerHTML = adminProds
          .map(
            (p) => `
              <tr>
                <td>${escapeHtml(p.title)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td>৳${Number(p.price).toLocaleString()}</td>
                <td>${p.stock}</td>
                <td><button type="button" onclick="deleteAdminProduct(${p.id})">Delete</button></td>
              </tr>
            `
          )
          .join('');
      }
    }

    if (ordRes.ok) {
      const adminOrds = await ordRes.json();
      const tbody = document.getElementById('adminOrdersBody');
      if (tbody) {
        tbody.innerHTML = adminOrds
          .map(
            (o) => `
              <tr>
                <td>${escapeHtml(o.order_code)}</td>
                <td>${escapeHtml(o.customer_name)}</td>
                <td>৳${Number(o.total_amount).toLocaleString()}</td>
                <td>
                  <select onchange="updateOrderStatus(${o.id}, this.value)">
                    ${['Placed', 'Confirmed', 'Shipped', 'Delivered']
                      .map(
                        (st) =>
                          `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`
                      )
                      .join('')}
                  </select>
                </td>
              </tr>
            `
          )
          .join('');
      }
    }
  } catch (err) {
    showToast('Could not load admin data');
  }
}

async function handleAddProduct(e) {
  e.preventDefault();
  if (!adminToken) {
    showToast('Please login as admin first');
    return;
  }

  const payload = {
    title: document.getElementById('newProdTitle')?.value.trim() || '',
    category: document.getElementById('newProdCategory')?.value.trim() || 'Apparel',
    price: Number(document.getElementById('newProdPrice')?.value || 0),
    stock: Number(document.getElementById('newProdStock')?.value || 10),
    badge: document.getElementById('newProdBadge')?.value.trim() || '',
    image_url: document.getElementById('newProdImage')?.value.trim() || '',
    description: document.getElementById('newProdDesc')?.value.trim() || '',
  };

  try {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not add product');

    e.target.reset();
    showToast('New product added');
    loadAdminData();
    fetchProducts();
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteAdminProduct(id) {
  if (!adminToken) return;
  try {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      showToast('Product deleted');
      loadAdminData();
      fetchProducts();
    }
  } catch (_) {}
}

async function updateOrderStatus(orderId, status) {
  if (!adminToken) return;
  try {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Order status updated to ${status}`);
    }
  } catch (_) {}
}

function findAdminTrigger() {
  return (
    document.getElementById('adminOpenBtn') ||
    document.getElementById('adminBtn') ||
    document.getElementById('openAdminBtn') ||
    document.querySelector('[data-admin-btn], [data-open-admin], [href="#admin"]') ||
    Array.from(document.querySelectorAll('button, a')).find((el) =>
      /\badmin\b/i.test((el.textContent || '').trim())
    )
  );
}

function showAdminLoginOrPanel() {
  if (adminToken) {
    openAdminPanel();
    return;
  }

  const modal =
    document.getElementById('adminLoginModal') ||
    document.getElementById('adminModal') ||
    document.querySelector('[data-admin-modal]');

  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
  } else {
    openAdminPanel();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = btn.dataset.category || btn.textContent.trim() || 'All';
      fetchProducts();
    });
  });

  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(fetchProducts, 250);
  });

  const cartTrigger =
    document.getElementById('cartBtn') ||
    document.getElementById('openCartBtn') ||
    document.querySelector('[data-cart-btn]');
  cartTrigger?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleCartDrawer(true);
  });

  document.getElementById('closeCartBtn')?.addEventListener('click', () => toggleCartDrawer(false));
  document.getElementById('drawerBackdrop')?.addEventListener('click', () => toggleCartDrawer(false));
  document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckout);
  document.getElementById('trackBtn')?.addEventListener('click', () => trackOrderByCode());

  const accTrigger =
    document.getElementById('accountBtn') ||
    document.getElementById('loginBtn') ||
    document.querySelector('[data-account-btn]');
  accTrigger?.addEventListener('click', (e) => {
    e.preventDefault();
    if (customerUser) {
      showToast(`Signed in as ${customerUser.name}`);
      return;
    }
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.style.zIndex = '9999';
    }
  });

  document.getElementById('closeAuthModal')?.addEventListener('click', () => {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  });
  document.getElementById('authForm')?.addEventListener('submit', (e) => handleCustomerAuth(e, 'login'));

  const adminTrigger = findAdminTrigger();
  if (adminTrigger) {
    adminTrigger.style.cursor = 'pointer';
    adminTrigger.style.position = 'relative';
    adminTrigger.style.zIndex = '50';
    adminTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAdminLoginOrPanel();
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target.closest('#adminOpenBtn, #adminBtn, #openAdminBtn, [data-admin-btn]');
    if (target) {
      e.preventDefault();
      showAdminLoginOrPanel();
    }
  });

  document.getElementById('closeAdminModal')?.addEventListener('click', () => {
    const modal =
      document.getElementById('adminLoginModal') ||
      document.getElementById('adminModal') ||
      document.querySelector('[data-admin-modal]');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  });

  const adminForm =
    document.getElementById('adminLoginForm') ||
    document.querySelector('#adminLoginModal form, #adminModal form');
  adminForm?.addEventListener('submit', handleAdminLogin);

  document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
  document.getElementById('backToStoreBtn')?.addEventListener('click', openMainStorefront);
  document.getElementById('brandHomeBtn')?.addEventListener('click', openMainStorefront);

  if (customerUser) {
    const accBtn = document.getElementById('accountBtn');
    if (accBtn) accBtn.textContent = customerUser.name;
  }

  updateCartUI();
  fetchProducts();
});