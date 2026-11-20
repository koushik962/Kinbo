const API_BASE = 'https://kinbo-api-0wdb.onrender.com/api';

let products = [];
let selectedCategory = 'All';
let selectedPriceFilter = 'ALL';
let selectedSort = 'default';
let authMode = 'login';

let cart = JSON.parse(localStorage.getItem('kinbo_cart') || '[]');
let customerToken = localStorage.getItem('kinbo_user_token') || null;
let customerUser = JSON.parse(localStorage.getItem('kinbo_user_info') || 'null');
let adminToken = localStorage.getItem('kinbo_admin_token') || null;

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    el.classList.add('hidden');
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
  const countEl = document.getElementById('cartCount');
  const totalCount = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);
  if (countEl) countEl.textContent = totalCount;

  const listEl = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('cartSubtotal');
  if (!listEl || !subtotalEl) return;

  if (!cart.length) {
    listEl.innerHTML = '<p class="empty-state">Your bag is empty. Add a youth drop to get started.</p>';
    subtotalEl.textContent = '৳0';
    return;
  }

  let subtotal = 0;
  listEl.innerHTML = cart
    .map((item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 1);
      subtotal += price * qty;
      return `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="muted">৳${price.toLocaleString()} × ${qty}</div>
          </div>
          <div class="cart-actions">
            <button type="button" onclick="changeQty(${item.id}, -1)">-</button>
            <button type="button" onclick="changeQty(${item.id}, 1)">+</button>
            <button type="button" onclick="removeFromCart(${item.id})">✕</button>
          </div>
        </div>
      `;
    })
    .join('');

  subtotalEl.textContent = `৳${subtotal.toLocaleString()}`;
}

function addToCart(productId) {
  const prod = products.find((p) => Number(p.id) === Number(productId));
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
  item.qty += Number(delta);
  if (item.qty <= 0) {
    cart = cart.filter((i) => Number(i.id) !== Number(productId));
  }
  saveCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => Number(i.id) !== Number(productId));
  saveCart();
}

function getFilteredProducts() {
  let list = [...products];

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

  return list;
}

function applyFiltersAndRender() {
  const list = getFilteredProducts();
  const countEl = document.getElementById('filterResultCount');
  if (countEl) {
    countEl.textContent = `Showing ${list.length} of ${products.length} items`;
  }
  renderProducts(list);
}

function renderProducts(list) {
  const grid = document.getElementById('productGrid');
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
  const grid = document.getElementById('productGrid');
  if (grid && !products.length) {
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
    products = await res.json();
    applyFiltersAndRender();
  } catch (err) {
    if (grid) {
      grid.innerHTML = '<p class="empty-state">Could not connect to backend API. Please try again in a moment.</p>';
    }
  }
}

function openMainStorefront() {
  document.getElementById('adminSection')?.classList.add('hidden');
  document.getElementById('storefrontSection')?.classList.remove('hidden');
  fetchProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Returned to Kinbo Storefront');
}

function openAdminPanel() {
  document.getElementById('adminLoginModal')?.classList.add('hidden');
  document.getElementById('storefrontSection')?.classList.add('hidden');
  document.getElementById('adminSection')?.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadAdminData();
}

function toggleCartDrawer(forceOpen) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (!drawer || !backdrop) return;

  const isClosed = drawer.classList.contains('hidden');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isClosed;

  drawer.classList.toggle('hidden', !shouldOpen);
  backdrop.classList.toggle('hidden', !shouldOpen);
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

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === 'register';
  document.getElementById('authModalTitle').textContent = isRegister ? 'Create Account' : 'Account Login';
  document.getElementById('authName')?.classList.toggle('hidden', !isRegister);
  document.getElementById('authSubmitBtn').textContent = isRegister ? 'Register' : 'Sign In';
  document.getElementById('toggleAuthModeBtn').textContent = isRegister
    ? 'Already have an account? Sign In'
    : 'Need an account? Register';
}

async function handleCustomerAuth(e) {
  e.preventDefault();
  const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
  const name = document.getElementById('authName')?.value.trim() || '';
  const email = document.getElementById('authEmail')?.value.trim() || '';
  const password = document.getElementById('authPassword')?.value || '';

  const payload = authMode === 'register' ? { name, email, password } : { email, password };

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
    document.getElementById('authModal')?.classList.add('hidden');
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
      throw new Error(data.error || 'Invalid admin credentials');
    }

    adminToken = data.token;
    localStorage.setItem('kinbo_admin_token', adminToken);
    showToast('Admin panel unlocked');
    openAdminPanel();
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
      showToast('Admin session expired. Please sign in again.');
      document.getElementById('adminSection')?.classList.add('hidden');
      document.getElementById('storefrontSection')?.classList.remove('hidden');
      document.getElementById('adminLoginModal')?.classList.remove('hidden');
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
  if (!adminToken) return;

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

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = btn.dataset.category || 'All';
      fetchProducts();
    });
  });

  document.getElementById('priceFilterSelect')?.addEventListener('change', (e) => {
    selectedPriceFilter = e.target.value;
    applyFiltersAndRender();
  });

  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    selectedSort = e.target.value;
    applyFiltersAndRender();
  });

  document.getElementById('resetFilterBtn')?.addEventListener('click', () => {
    selectedCategory = 'All';
    selectedPriceFilter = 'ALL';
    selectedSort = 'default';
    document.querySelectorAll('.cat-btn').forEach((b) => {
      b.classList.toggle('active', (b.dataset.category || 'All') === 'All');
    });
    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.value = '';
    const priceEl = document.getElementById('priceFilterSelect');
    const sortEl = document.getElementById('sortSelect');
    if (priceEl) priceEl.value = 'ALL';
    if (sortEl) sortEl.value = 'default';
    fetchProducts();
  });

  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(fetchProducts, 250);
  });

  document.getElementById('cartBtn')?.addEventListener('click', () => toggleCartDrawer(true));
  document.getElementById('closeCartBtn')?.addEventListener('click', () => toggleCartDrawer(false));
  document.getElementById('drawerBackdrop')?.addEventListener('click', () => toggleCartDrawer(false));
  document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckout);
  document.getElementById('trackBtn')?.addEventListener('click', () => trackOrderByCode());

  document.getElementById('accountBtn')?.addEventListener('click', () => {
    if (customerUser) {
      showToast(`Signed in as ${customerUser.name}`);
      return;
    }
    setAuthMode('login');
    document.getElementById('authModal')?.classList.remove('hidden');
  });
  document.getElementById('closeAuthModal')?.addEventListener('click', () => {
    document.getElementById('authModal')?.classList.add('hidden');
  });
  document.getElementById('toggleAuthModeBtn')?.addEventListener('click', () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
  });
  document.getElementById('authForm')?.addEventListener('submit', handleCustomerAuth);

  document.getElementById('adminOpenBtn')?.addEventListener('click', () => {
    if (adminToken) {
      openAdminPanel();
    } else {
      document.getElementById('adminLoginModal')?.classList.remove('hidden');
    }
  });
  document.getElementById('closeAdminModal')?.addEventListener('click', () => {
    document.getElementById('adminLoginModal')?.classList.add('hidden');
  });
  document.getElementById('adminLoginForm')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
  document.getElementById('backToStoreBtn')?.addEventListener('click', openMainStorefront);
  document.getElementById('brandHomeBtn')?.addEventListener('click', openMainStorefront);

  if (customerUser && document.getElementById('accountBtn')) {
    document.getElementById('accountBtn').textContent = customerUser.name;
  }

  updateCartUI();
  fetchProducts();
});