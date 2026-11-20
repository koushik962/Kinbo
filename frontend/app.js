:root {
  --bg: #f6f7fb;
  --surface: #ffffff;
  --surface-soft: #f0f2f8;
  --text: #111827;
  --muted: #6b7280;
  --border: #e5e7eb;
  --primary: #111827;
  --primary-hover: #273043;
  --accent: #4f46e5;
  --accent-soft: #eef2ff;
  --danger: #dc2626;
  --radius-lg: 18px;
  --radius-md: 12px;
  --radius-sm: 8px;
  --shadow-sm: 0 2px 10px rgba(17, 24, 39, 0.05);
  --shadow-md: 0 12px 30px rgba(17, 24, 39, 0.08);
  --shadow-lg: 0 24px 50px rgba(17, 24, 39, 0.16);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

.hidden {
  display: none !important;
}

.muted {
  color: var(--muted);
  font-size: 0.9rem;
}

/* Navbar */
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-btn {
  background: none;
  border: none;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text);
  cursor: pointer;
  padding: 2px 6px;
}

.search-wrap {
  flex: 1;
  max-width: 440px;
}

.search-wrap input {
  width: 100%;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.search-wrap input:focus {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-btn {
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-btn:hover {
  border-color: #cbd5e1;
  background: var(--surface-soft);
  transform: translateY(-1px);
}

.admin-trigger {
  background: var(--accent-soft);
  border-color: #c7d2fe;
  color: var(--accent);
}

.admin-trigger:hover {
  background: #e0e7ff;
}

/* Main Storefront */
.storefront-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.hero-banner {
  background: linear-gradient(135deg, #111827 0%, #1f2937 55%, #312e81 100%);
  color: #ffffff;
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  box-shadow: var(--shadow-md);
  margin-bottom: 22px;
}

.hero-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.14);
  padding: 5px 12px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.hero-banner h1 {
  font-size: clamp(1.8rem, 3.5vw, 2.7rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin-bottom: 10px;
}

.hero-banner p {
  color: rgba(255, 255, 255, 0.82);
  font-size: 1rem;
  max-width: 560px;
}

/* Category & Filter Toolbar */
.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.category-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cat-btn {
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-btn:hover {
  border-color: #cbd5e1;
  background: var(--surface-soft);
}

.cat-btn.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.filter-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
}

.filter-group select {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
}

.filter-group select:focus {
  border-color: var(--accent);
}

.filter-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
}

/* Products Bento Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.product-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: #d1d5db;
}

.product-img-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--surface-soft);
  overflow: hidden;
}

.product-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.product-card:hover .product-img-wrap img {
  transform: scale(1.04);
}

.badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  background: rgba(17, 24, 39, 0.86);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  backdrop-filter: blur(6px);
}

.product-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.product-cat {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  margin-bottom: 6px;
}

.product-body h3 {
  font-size: 1.08rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text);
}

.product-desc {
  font-size: 0.88rem;
  color: var(--muted);
  margin-bottom: 16px;
  flex: 1;
}

.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--surface-soft);
}

.price {
  font-size: 1.12rem;
  font-weight: 800;
  color: var(--text);
}

/* Buttons */
.btn-primary {
  padding: 9px 15px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--primary);
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  padding: 8px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--surface-soft);
}

.full-btn {
  width: 100%;
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.close-btn:hover {
  background: #e5e7eb;
}

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  text-decoration: underline;
}

/* Track Order Section */
.track-section {
  margin-top: 44px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-sm);
}

.track-section h2 {
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 14px;
}

.track-box {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.track-box input {
  flex: 1;
  min-width: 220px;
  padding: 11px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-soft);
  font-size: 0.92rem;
  outline: none;
}

.track-box input:focus {
  border-color: var(--accent);
  background: var(--surface);
}

.track-result {
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  display: grid;
  gap: 6px;
  font-size: 0.92rem;
}

.error-text {
  color: var(--danger);
  font-weight: 600;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px 16px;
  color: var(--muted);
  font-size: 0.95rem;
}

/* Cart Drawer */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  backdrop-filter: blur(3px);
  z-index: 60;
}

.cart-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  max-width: 420px;
  height: 100vh;
  background: var(--surface);
  z-index: 70;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.drawer-head {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-head h3 {
  font-size: 1.15rem;
  font-weight: 800;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.cart-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cart-actions button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
}

.cart-actions button:hover {
  background: #e5e7eb;
}

.drawer-foot {
  padding: 18px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.subtotal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.05rem;
  margin-bottom: 14px;
}

/* Forms & Modals */
.stack-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stack-form input,
.stack-form select,
.stack-form textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
}

.stack-form input:focus,
.stack-form select:focus,
.stack-form textarea:focus {
  border-color: var(--accent);
  background: var(--surface);
}

.stack-form textarea {
  min-height: 76px;
  resize: vertical;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(4px);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-box {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 22px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-head h3 {
  font-size: 1.15rem;
  font-weight: 800;
}

.modal-switch {
  margin-top: 14px;
  text-align: center;
}

/* Admin Panel */
.admin-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 20px 64px;
}

.admin-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin-bottom: 22px;
  box-shadow: var(--shadow-sm);
}

.admin-topbar h2 {
  font-size: 1.4rem;
  font-weight: 800;
}

.admin-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  margin-bottom: 22px;
}

.admin-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.admin-card h3 {
  font-size: 1.08rem;
  font-weight: 700;
  margin-bottom: 14px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  background: var(--surface-soft);
}

td button {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: var(--danger);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

td button:hover {
  background: #fee2e2;
}

td select {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  font-size: 0.85rem;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 22px;
  right: 22px;
  z-index: 100;
  background: var(--primary);
  color: #ffffff;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
}

/* Responsive */
@media (max-width: 960px) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .admin-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .nav-inner {
    flex-wrap: wrap;
  }
  .search-wrap {
    order: 3;
    max-width: 100%;
    flex-basis: 100%;
  }
  .product-grid {
    grid-template-columns: 1fr;
  }
  .hero-banner {
    padding: 28px 20px;
  }
}