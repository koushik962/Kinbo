const API_BASE = 'http://127.0.0.1:5000/api';

let products = [];
let selectedCategory = 'All';
let cart = JSON.parse(localStorage.getItem('kinbo_cart') || '[]');
let customerToken = localStorage.getItem('kinbo_user_token') || null;
let customerUser = JSON.parse(localStorage.getItem('kinbo_user_info') || 'null');
let adminToken = localStorage.getItem('kinbo_admin_token') || null;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

function switchView(view) {
  document.getElementById('storeView').classList.toggle('hidden', view !== 'store');
  document.getElementById('adminView').classList.toggle('hidden', view !== 'admin');
  if (view === 'admin') {
    checkAdminState();
  }
}

async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    products = await res.json();
    renderCategories();
    renderProducts();
  } catch {
    showToast('Backend server is not running yet (port 5000)');
  }
}

function renderCategories() {
  const cats = ['All', ...new Set(products.map(p => p.category))];
  const wrap = document.getElementById('categoryPills');
  wrap.innerHTML = cats.map(c => `
    <button class="filter-pill ${selectedCategory === c ? 'active' : ''}" onclick="selectCategory('${c}')">${c}</button>
  `).join('');
}

function selectCategory(cat) {
  selectedCategory = cat;
  renderCategories();
  renderProducts();
}

function renderProducts() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filtered = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const grid = document.getElementById('productGrid');
  if (!filtered.length) {
    grid.innerHTML = `<p class="muted-text">No matching drops found.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <article class="product-card">
      <div class="product-img-wrap">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy" />
        <span class="product-tag">${p.tag}</span>
      </div>
      <div class="product-body">
        <span class="product-cat">${p.category} • Stock: ${p.stock}</span>
        <h3 class="product-title">${p.name}</h3>
        <div class="product-foot">
          <span class="price">৳${Number(p.price).toLocaleString()}</span>
          <button class="add-btn" onclick="addToCart(${p.id})">+ Add</button>
        </div>
      </div>
    </article>
  `).join('');
}

function saveCart() {
  localStorage.setItem('kinbo_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }
  saveCart();
  showToast(`${prod.name} added to bag`);
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  saveCart();
}

function updateCartUI() {
  const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalPrice = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  document.getElementById('bagCount').textContent = totalQty;
  document.getElementById('cartTotal').textContent = `৳${totalPrice.toLocaleString()}`;
  document.getElementById('modalTotal').textContent = `৳${totalPrice.toLocaleString()}`;

  const wrap = document.getElementById('cartItems');
  if (!cart.length) {
    wrap.innerHTML = `<p class="muted-text">Your bag is empty. Pick a drop to start.</p>`;
    return;
  }

  wrap.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div>
        <strong>${i.name}</strong>
        <div class="muted-text">৳${(i.price * i.qty).toLocaleString()}</div>
      </div>
      <div class="qty-controls">
        <button onclick="changeQty(${i.id}, -1)">-</button>
        <span>${i.qty}</span>
        <button onclick="changeQty(${i.id}, 1)">+</button>
      </div>
    </div>
  `).join('');
}

function toggleCart(open) {
  document.getElementById('cartBackdrop').classList.toggle('hidden', !open);
  document.getElementById('cartDrawer').classList.toggle('open', open);
}

function closeModals() {
  ['checkoutModal', 'accountModal', 'trackModal'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

function openCheckoutModal() {
  if (!cart.length) {
    showToast('Add at least one item first');
    return;
  }
  toggleCart(false);
  document.getElementById('orderSuccessBox').classList.add('hidden');
  const badge = document.getElementById('checkoutModeBadge');
  if (customerUser) {
    badge.innerHTML = `Ordering as <strong>${customerUser.name}</strong> (Account linked)`;
    document.getElementById('cName').value = customerUser.name || '';
  } else {
    badge.innerHTML = `<strong>Guest Mode:</strong> No account needed. Just enter delivery details.`;
  }
  document.getElementById('checkoutModal').classList.remove('hidden');
}

async function submitOrder(e) {
  e.preventDefault();
  const totalAmount = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const itemsSummary = cart.map(i => `${i.name} x${i.qty}`).join(', ');

  const headers = { 'Content-Type': 'application/json' };
  if (customerToken) headers['Authorization'] = `Bearer ${customerToken}`;

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer_name: document.getElementById('cName').value,
      customer_phone: document.getElementById('cPhone').value,
      shipping_address: document.getElementById('cAddress').value,
      items_summary: itemsSummary,
      total_amount: totalAmount
    })
  });

  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || 'Order failed');
    return;
  }

  cart = [];
  saveCart();
  const box = document.getElementById('orderSuccessBox');
  box.classList.remove('hidden');
  box.innerHTML = `
    <strong>Order Confirmed!</strong><br/>
    Order Code: <span class="order-code"><strong>${data.order_code}</strong></span><br/>
    Mode: ${data.is_guest ? 'Guest Checkout (No Account)' : 'Account Checkout'}<br/>
    Save this code to track your order anytime.
  `;
}

function openAccountModal() {
  const wrap = document.getElementById('accountContent');
  if (customerUser) {
    wrap.innerHTML = `
      <p class="muted-text">Signed in as <strong>${customerUser.name}</strong> (${customerUser.email})</p>
      <button class="chip-btn mt-16" onclick="logoutCustomer()">Sign Out</button>
    `;
  } else {
    wrap.innerHTML = `
      <p class="muted-text">Optional account for faster re-orders. Guest checkout works without an account too.</p>
      <form onsubmit="handleCustomerAuth(event, 'login')" class="stack-form">
        <h4>Login</h4>
        <input id="custLoginEmail" type="email" placeholder="Email" required />
        <input id="custLoginPass" type="password" placeholder="Password" required />
        <button class="primary-btn" type="submit">Login</button>
      </form>
      <hr class="mt-16"/>
      <form onsubmit="handleCustomerAuth(event, 'register')" class="stack-form">
        <h4>Create Account</h4>
        <input id="custRegName" type="text" placeholder="Your Name" required />
        <input id="custRegEmail" type="email" placeholder="Email" required />
        <input id="custRegPass" type="password" placeholder="Password" required />
        <button class="chip-btn" type="submit">Sign Up</button>
      </form>
    `;
  }
  document.getElementById('accountModal').classList.remove('hidden');
}

async function handleCustomerAuth(e, mode) {
  e.preventDefault();
  const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
  const payload = mode === 'login'
    ? { email: document.getElementById('custLoginEmail').value, password: document.getElementById('custLoginPass').value }
    : { name: document.getElementById('custRegName').value, email: document.getElementById('custRegEmail').value, password: document.getElementById('custRegPass').value };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || 'Authentication failed');
    return;
  }
  customerToken = data.token;
  customerUser = data.user;
  localStorage.setItem('kinbo_user_token', customerToken);
  localStorage.setItem('kinbo_user_info', JSON.stringify(customerUser));
  document.getElementById('accountBtn').textContent = customerUser.name.split(' ')[0];
  closeModals();
  showToast(`Welcome, ${customerUser.name}!`);
}

function logoutCustomer() {
  customerToken = null;
  customerUser = null;
  localStorage.removeItem('kinbo_user_token');
  localStorage.removeItem('kinbo_user_info');
  document.getElementById('accountBtn').textContent = 'Account';
  closeModals();
  showToast('Signed out');
}

function openTrackModal() {
  document.getElementById('trackResult').innerHTML = '';
  document.getElementById('trackModal').classList.remove('hidden');
}

async function lookupOrder() {
  const code = document.getElementById('trackCodeInput').value.trim();
  if (!code) return;
  const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(code)}`);
  const data = await res.json();
  const out = document.getElementById('trackResult');
  if (!res.ok) {
    out.innerHTML = `<p class="muted-text">${data.error}</p>`;
    return;
  }
  out.innerHTML = `
    <div class="cart-item">
      <div>
        <strong>${data.order_code}</strong> • <span class="pill-badge">${data.status}</span>
        <div class="muted-text">${data.items_summary} — ৳${data.total_amount}</div>
      </div>
    </div>
  `;
}

// --- ADMIN ---
function checkAdminState() {
  const loggedIn = Boolean(adminToken);
  document.getElementById('adminLoginBox').classList.toggle('hidden', loggedIn);
  document.getElementById('adminDashboard').classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    loadAdminData();
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: document.getElementById('adminEmail').value,
      password: document.getElementById('adminPassword').value
    })
  });
  const data = await res.json();
  if (!res.ok || data.user?.role !== 'ADMIN') {
    showToast('Invalid admin credentials');
    return;
  }
  adminToken = data.token;
  localStorage.setItem('kinbo_admin_token', adminToken);
  checkAdminState();
  showToast('Admin panel unlocked');
}

function logoutAdmin() {
  adminToken = null;
  localStorage.removeItem('kinbo_admin_token');
  checkAdminState();
}

async function loadAdminData() {
  const headers = { 'Authorization': `Bearer ${adminToken}` };
  const [prodRes, ordRes] = await Promise.all([
    fetch(`${API_BASE}/products`),
    fetch(`${API_BASE}/admin/orders`, { headers })
  ]);

  if (ordRes.status === 401 || ordRes.status === 403) {
    logoutAdmin();
    return;
  }

  const prods = await prodRes.json();
  const orders = await ordRes.json();
  const revenue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  document.getElementById('adminKpis').innerHTML = `
    <div class="kpi-box"><span>Total Drops</span><strong>${prods.length}</strong></div>
    <div class="kpi-box"><span>Total Orders</span><strong>${orders.length}</strong></div>
    <div class="kpi-box"><span>Guest Orders</span><strong>${orders.filter(o => o.is_guest).length}</strong></div>
    <div class="kpi-box"><span>Order Volume</span><strong>৳${revenue.toLocaleString()}</strong></div>
  `;

  document.getElementById('adminProductList').innerHTML = prods.map(p => `
    <div class="admin-row-item">
      <span><strong>${p.name}</strong> (৳${p.price} • Stock: ${p.stock})</span>
      <button class="chip-btn" onclick="deleteProduct(${p.id})">Delete</button>
    </div>
  `).join('');

  document.getElementById('adminOrderList').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Type</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td class="order-code"><strong>${o.order_code}</strong></td>
            <td>${o.is_guest ? 'Guest' : 'Account'}</td>
            <td>${o.customer_name}<br/><span class="muted-text">${o.customer_phone}</span></td>
            <td>${o.items_summary}</td>
            <td>৳${Number(o.total_amount).toLocaleString()}</td>
            <td>
              <select onchange="updateOrderStatus(${o.id}, this.value)">
                ${['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(st =>
                  `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`
                ).join('')}
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function handleAddProduct(e) {
  e.preventDefault();
  const res = await fetch(`${API_BASE}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: document.getElementById('pName').value,
      category: document.getElementById('pCategory').value,
      price: document.getElementById('pPrice').value,
      stock: document.getElementById('pStock').value,
      tag: document.getElementById('pTag').value,
      image_url: document.getElementById('pImage').value
    })
  });
  if (res.ok) {
    e.target.reset();
    await fetchProducts();
    await loadAdminData();
    showToast('New drop published!');
  }
}

async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  if (res.ok) {
    await fetchProducts();
    await loadAdminData();
    showToast('Product removed');
  }
}

async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status })
  });
  if (res.ok) {
    showToast(`Order status → ${status}`);
  }
}

// Init
if (customerUser) {
  document.getElementById('accountBtn').textContent = customerUser.name.split(' ')[0];
}
updateCartUI();
fetchProducts();
