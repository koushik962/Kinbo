const API_BASE = 'https://kinbo-api-0wdb.onrender.com/api';

let products = [];
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

function ensureProductFilterBar() {
  const grid = document.getElementById('productGrid');
  if (!grid || !grid.parentNode || document.getElementById('productFilterBar')) return;

  const bar = document.createElement('div');
  bar.id = 'productFilterBar';
  bar.className = 'filter-bar';
  bar.style.cssText =
    'display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:12px 0 18px;padding:10px 14px;border-radius:10px;border:1px solid rgba(128,128,128,0.25);';

  bar.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
      <label for="priceFilterSelect" style="font-size:13px;font-weight:600;">Price:</label>
      <select id="priceFilterSelect" style="padding:6px 10px;border-radius:8px;">
        <option value="ALL">All Prices</option>
        <option value="UNDER_1500">Under ৳1,500</option>
        <option value="1500_2500">৳1,500 – ৳2,500</option>
        <option value="ABOVE_2500">Above ৳2,500</option>
      </select>

      <label for="sortSelect" style="font-size:13px;font-weight:600;">Sort:</label>
      <select id="sortSelect" style="padding:6px 10px;border-radius:8px;">
        <option value="default">Featured</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="name_asc">Name: A to Z</option>
      </select>

      <button type="button" id="resetFilterBtn" style="padding:6px 12px;border-radius:8px;cursor:pointer;">Reset</button>
    </div>
    <span id="filterResultCount" style="font-size:13px;opacity:0.85;"></span>
  `;

  grid.parentNode.insertBefore(bar, grid);

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

    document.querySelectorAll('.cat-btn').forEach((b, idx) => {
      const cat = b.dataset.category || b.textContent.trim();
      b.classList.toggle('active', cat === 'All' || (idx === 0 && !b.dataset.category));
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    const priceSel = document.getElementById('priceFilterSelect');
    const sortSel = document.getElementById('sortSelect');
    if (priceSel) priceSel.value = 'ALL';
    if (sortSel) sortSel.value = 'default';

    fetchProducts();
  });
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
  ensureProductFilterBar();
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

function getAdminContainer() {
  return (
    document.getElementById('adminSection') ||
    document.getElementById('adminPanel') ||
    document.getElementById('adminDashboard') ||
    document.querySelector('[data-admin-panel], .admin-panel, .admin-section')
  );
}

function getStorefrontContainers() {
  const explicit =
    document.getElementById('storefrontSection') ||
    document.getElementById('mainStorefront') ||
    document.getElementById('storefront');
  if (explicit) return [explicit];

  const adminEl = getAdminContainer();
  return Array.from(document.querySelectorAll('main, section')).filter((el) => {
    if (!el || el === adminEl) return false;
    if (adminEl && (el.contains(adminEl) || adminEl.contains(el))) return false;
    const cls = (el.className || '').toString().toLowerCase();
    const id = (el.id || '').toLowerCase();
    if (cls.includes('modal') || id.includes('modal') || id.includes('drawer')) return false;
    return true;
  });
}

function ensureBackToStoreButton(adminEl) {
  if (!adminEl || document.getElementById('backToStoreBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'backToStoreBtn';
  btn.type = 'button';
  btn.textContent = '← Back to Main Store';
  btn.style.cssText =
    'padding:10px 16px;border-radius:10px;border:1px solid #374151;background:#111827;color:#ffffff;font-weight:600;cursor:pointer;margin:0 0 16px 0;display:inline-flex;align-items:center;gap:6px;';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openMainStorefront();
  });

  adminEl.prepend(btn);
}

function openMainStorefront() {
  const adminEl = getAdminContainer();
  if (adminEl) {
    adminEl.classList.add('hidden');
    adminEl.style.display = 'none';
  }

  getStorefrontContainers().forEach((el) => {
    el.classList.remove('hidden');
    el.style.display = '';
  });

  fetchProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Returned to Kinbo Storefront');
}

function openAdminPanel() {
  const adminEl = getAdminContainer();
  if (!adminEl) {
    showToast('Admin section not found');
    return;
  }

  // Close login modal if open
  ['adminLoginModal', 'adminModal'].forEach((id) => {
    const m = document.getElementById(id);
    if (m) {
      m.classList.add('hidden');
      m.style.display = 'none';
    }
  });

  getStorefrontContainers().forEach((el) => {
    el.classList.add('hidden');
    el.style.display = 'none';
  });

  adminEl.classList.remove('hidden');
  adminEl.style.display = 'block';
  ensureBackToStoreButton(adminEl);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadAdminData();
}

function toggleCartDrawer(forceOpen) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (!drawer || !backdrop) return;

  const isClosed = drawer.classList.contains('hidden') || getComputedStyle(drawer).display === 'none';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isClosed;

  drawer.classList.toggle('hidden', !shouldOpen);
  drawer.style.display = shouldOpen ? 'block' : 'none';
  backdrop.classList.toggle('hidden', !shouldOpen);
  backdrop.style.display = shouldOpen ? 'block' : 'none';
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
      showToast('Admin session expired. Please log in again.');
      const modal = document.getElementById('adminLoginModal') || document.getElementById('adminModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
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
  } catch (_) {}
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
      selectedCategory = btn.dataset.category || btn.textContent.trim() || 'All';
      fetchProducts();
    });
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
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
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

  document.getElementById('adminOpenBtn')?.addEventListener('click', () => {
    if (adminToken) {
      openAdminPanel();
    } else {
      const modal = document.getElementById('adminLoginModal') || document.getElementById('adminModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      } else {
        openAdminPanel();
      }
    }
  });

  document.getElementById('closeAdminModal')?.addEventListener('click', () => {
    const modal = document.getElementById('adminLoginModal') || document.getElementById('adminModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
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