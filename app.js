// ==================== STATE ====================
let currentUser = null;
let cart = [];
let orderType = 'dinein';
let selectedCategory = 0;
let payMethod = 'tunai';

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  populateLoginUsers();
  renderCategories();
  renderProducts();
  updateClock();
  setInterval(updateClock, 60000);
});

function updateClock() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' };
  const str = now.toLocaleDateString('id-ID', opts);
  const el1 = document.getElementById('topbarDate');
  const el2 = document.getElementById('adminDatetime');
  if (el1) el1.textContent = str;
  if (el2) el2.textContent = str;
}

// ==================== LOGIN ====================
function populateLoginUsers() {
  const sel = document.getElementById('loginUser');
  sel.innerHTML = DB.users.filter(u => u.is_active).map(u =>
    `<option value="${u.id}">${u.name} (${u.role})</option>`
  ).join('');
}

function handleLogin() {
  const uid = parseInt(document.getElementById('loginUser').value);
  const pin = document.getElementById('loginPin').value;
  const user = DB.users.find(u => u.id === uid);
  if (!user || user.pin !== pin) {
    document.getElementById('loginError').textContent = 'PIN salah!';
    return;
  }
  currentUser = user;
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginPin').value = '';
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.name[0];
  document.getElementById('btnAdminPanel').style.display = user.role === 'admin' ? 'flex' : 'none';
  switchScreen('posScreen');
  showToast('Selamat datang, ' + user.name + '!', 'success');
}

function handleLogout() {
  currentUser = null;
  cart = [];
  renderCart();
  switchScreen('loginScreen');
}

function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ==================== CATEGORIES ====================
function renderCategories() {
  const el = document.getElementById('categoryTabs');
  let html = `<button class="category-tab active" onclick="filterByCategory(0, this)">Semua</button>`;
  DB.categories.forEach(c => {
    html += `<button class="category-tab" onclick="filterByCategory(${c.id}, this)">${c.icon} ${c.name}</button>`;
  });
  el.innerHTML = html;
}

function filterByCategory(catId, btn) {
  selectedCategory = catId;
  document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

// ==================== PRODUCTS ====================
function renderProducts() {
  const grid = document.getElementById('productGrid');
  const search = document.getElementById('searchMenu').value.toLowerCase();
  let products = getProductsByCategory(selectedCategory);
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search));

  const emojiMap = { 1:'☕', 2:'🧋', 3:'🍞', 4:'🍪' };
  grid.innerHTML = products.map(p => {
    const emoji = emojiMap[p.category_id] || '🍽️';
    const unavail = !p.is_available ? ' product-unavailable' : '';
    return `<div class="product-card${unavail}" onclick="addToCart(${p.id})">
      <span class="product-emoji">${emoji}</span>
      <span class="product-name">${p.name}</span>
      <span class="product-cat">${getCategoryName(p.category_id)}</span>
      <span class="product-price">${formatRupiah(p.base_price)}</span>
    </div>`;
  }).join('');

  if (products.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:40px">Tidak ada produk ditemukan</div>';
  }
}

function filterMenu() { renderProducts(); }

// ==================== CART ====================
function addToCart(productId) {
  const product = DB.products.find(p => p.id === productId);
  if (!product) return;
  const variants = getVariants(productId);
  if (variants.length > 0) {
    showVariantModal(product, variants);
    return;
  }
  addItemToCart(product, null);
}

function showVariantModal(product, variants) {
  document.getElementById('variantTitle').textContent = product.name + ' — Pilih Varian';
  const el = document.getElementById('variantOptions');
  el.innerHTML = variants.map(v => {
    const price = product.base_price + v.price_adjustment;
    return `<button class="variant-btn" onclick="addItemToCart(DB.products.find(p=>p.id===${product.id}), DB.product_variants.find(v=>v.id===${v.id})); closeModalById('variantModal')">
      <span>${v.name}</span>
      <span class="v-price">${formatRupiah(price)}</span>
    </button>`;
  }).join('');
  openModal('variantModal');
}

function addItemToCart(product, variant) {
  const key = product.id + '-' + (variant ? variant.id : 'none');
  const existing = cart.find(c => c.key === key);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      key, productId: product.id, variantId: variant ? variant.id : null,
      name: product.name, variant: variant ? variant.name : null,
      price: product.base_price + (variant ? variant.price_adjustment : 0),
      qty: 1
    });
  }
  renderCart();
  showToast(product.name + (variant ? ' (' + variant.name + ')' : '') + ' ditambahkan', 'success');
}

function removeFromCart(key) {
  cart = cart.filter(c => c.key !== key);
  renderCart();
}

function updateQty(key, delta) {
  const item = cart.find(c => c.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(key); return; }
  renderCart();
}

function clearCart() {
  cart = [];
  document.getElementById('customerName').value = '';
  document.getElementById('tableNo').value = '';
  renderCart();
}

function renderCart() {
  const el = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const summary = document.getElementById('cartSummary');
  const badge = document.getElementById('cartBadge');
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  badge.textContent = totalQty;

  if (cart.length === 0) {
    el.innerHTML = `<div class="cart-empty" id="cartEmpty"><span class="cart-empty-icon">🛒</span><p>Belum ada pesanan</p><small>Pilih menu di sebelah kiri</small></div>`;
    summary.style.display = 'none';
    return;
  }
  summary.style.display = 'block';
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.variant ? `<div class="cart-item-variant">${item.variant}</div>` : ''}
        <div class="cart-item-price">${formatRupiah(item.price)}</div>
      </div>
      <div class="cart-item-actions">
        <button class="qty-btn" onclick="updateQty('${item.key}', -1)">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" onclick="updateQty('${item.key}', 1)">+</button>
        <button class="cart-item-remove" onclick="removeFromCart('${item.key}')">✕</button>
      </div>
    </div>
  `).join('');
  recalcCart();
}

function recalcCart() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discVal = parseFloat(document.getElementById('discountInput').value) || 0;
  const discType = document.getElementById('discountType').value;
  const discount = discType === 'percent' ? subtotal * discVal / 100 : discVal;
  const afterDisc = Math.max(0, subtotal - discount);
  const tax = Math.round(afterDisc * 0.1);
  const total = afterDisc + tax;

  document.getElementById('subtotalText').textContent = formatRupiah(subtotal);
  document.getElementById('taxText').textContent = formatRupiah(tax);
  document.getElementById('totalText').textContent = formatRupiah(total);
}

function getTotal() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discVal = parseFloat(document.getElementById('discountInput').value) || 0;
  const discType = document.getElementById('discountType').value;
  const discount = discType === 'percent' ? subtotal * discVal / 100 : discVal;
  const afterDisc = Math.max(0, subtotal - discount);
  const tax = Math.round(afterDisc * 0.1);
  return { subtotal, discount, afterDisc, tax, total: afterDisc + tax };
}

// ==================== ORDER TYPE ====================
function setOrderType(type, btn) {
  orderType = type;
  document.querySelectorAll('.order-type').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ==================== CHECKOUT ====================
function openCheckout() {
  if (cart.length === 0) return;
  const { total } = getTotal();
  document.getElementById('checkoutTotal').textContent = formatRupiah(total);
  document.getElementById('cashReceived').value = '';
  document.getElementById('changeDisplay').style.display = 'none';
  document.getElementById('checkoutNote').value = '';
  payMethod = 'tunai';
  document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.method-btn[data-method="tunai"]').classList.add('active');
  document.getElementById('cashSection').style.display = 'block';
  renderQuickCash(total);
  openModal('checkoutModal');
}

function selectPayMethod(method, btn) {
  payMethod = method;
  document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cashSection').style.display = method === 'tunai' ? 'block' : 'none';
}

function renderQuickCash(total) {
  const el = document.getElementById('quickCash');
  const suggestions = [];
  const rounded = Math.ceil(total / 10000) * 10000;
  [rounded, 50000, 100000, 200000].forEach(v => {
    if (v >= total && !suggestions.includes(v)) suggestions.push(v);
  });
  el.innerHTML = suggestions.map(v =>
    `<button onclick="document.getElementById('cashReceived').value=${v};calcChange()">${formatRupiah(v)}</button>`
  ).join('');
}

function calcChange() {
  const { total } = getTotal();
  const cash = parseFloat(document.getElementById('cashReceived').value) || 0;
  const changeEl = document.getElementById('changeDisplay');
  if (cash >= total) {
    changeEl.style.display = 'block';
    document.getElementById('changeAmount').textContent = formatRupiah(cash - total);
  } else {
    changeEl.style.display = 'none';
  }
}

function processPayment() {
  const { subtotal, discount, tax, total } = getTotal();
  if (payMethod === 'tunai') {
    const cash = parseFloat(document.getElementById('cashReceived').value) || 0;
    if (cash < total) { showToast('Uang kurang!', 'error'); return; }
  }
  const invoiceNo = generateInvoiceNo();
  const txn = {
    id: DB.transactions.length + 1,
    invoice_no: invoiceNo,
    user_id: currentUser.id,
    user_name: currentUser.name,
    customer: document.getElementById('customerName').value || '-',
    table_no: document.getElementById('tableNo').value || '-',
    order_type: orderType,
    items: cart.map(c => ({ ...c })),
    subtotal, discount, tax, total,
    payment_method: payMethod,
    amount_paid: payMethod === 'tunai' ? parseFloat(document.getElementById('cashReceived').value) : total,
    change_given: payMethod === 'tunai' ? (parseFloat(document.getElementById('cashReceived').value) - total) : 0,
    note: document.getElementById('checkoutNote').value,
    status: 'completed',
    created_at: new Date().toISOString()
  };
  DB.transactions.push(txn);
  saveData();
  closeModalById('checkoutModal');
  showReceipt(txn);
  showToast('Pembayaran berhasil! ' + invoiceNo, 'success');
}

// ==================== RECEIPT ====================
function showReceipt(txn) {
  const el = document.getElementById('receiptPaper');
  const date = new Date(txn.created_at);
  const dateStr = date.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  let itemsHtml = txn.items.map(i =>
    `<div class="r-item"><div class="r-item-name">${i.name}${i.variant ? ' ('+i.variant+')' : ''}</div><div class="r-row"><span>${i.qty} x ${formatRupiah(i.price)}</span><span>${formatRupiah(i.qty * i.price)}</span></div></div>`
  ).join('');

  el.innerHTML = `
    <div class="r-center"><div class="r-brand">☕ Hello Coffee</div><div class="r-sub">Jl. Kopi Nikmat No. 123</div></div>
    <div class="r-line"></div>
    <div class="r-row"><span>No:</span><span>${txn.invoice_no}</span></div>
    <div class="r-row"><span>Tanggal:</span><span>${dateStr}</span></div>
    <div class="r-row"><span>Kasir:</span><span>${txn.user_name}</span></div>
    <div class="r-row"><span>Tipe:</span><span>${txn.order_type === 'dinein' ? 'Dine In' : 'Take Away'}</span></div>
    ${txn.table_no !== '-' ? `<div class="r-row"><span>Meja:</span><span>${txn.table_no}</span></div>` : ''}
    ${txn.customer !== '-' ? `<div class="r-row"><span>Pelanggan:</span><span>${txn.customer}</span></div>` : ''}
    <div class="r-line"></div>
    ${itemsHtml}
    <div class="r-line"></div>
    <div class="r-row"><span>Subtotal</span><span>${formatRupiah(txn.subtotal)}</span></div>
    ${txn.discount > 0 ? `<div class="r-row"><span>Diskon</span><span>-${formatRupiah(txn.discount)}</span></div>` : ''}
    <div class="r-row"><span>Pajak (10%)</span><span>${formatRupiah(txn.tax)}</span></div>
    <div class="r-line"></div>
    <div class="r-row r-total"><span>TOTAL</span><span>${formatRupiah(txn.total)}</span></div>
    <div class="r-line"></div>
    <div class="r-row"><span>Bayar (${txn.payment_method})</span><span>${formatRupiah(txn.amount_paid)}</span></div>
    ${txn.change_given > 0 ? `<div class="r-row"><span>Kembali</span><span>${formatRupiah(txn.change_given)}</span></div>` : ''}
    <div class="r-line"></div>
    <div class="r-footer">Terima kasih sudah berkunjung!<br>~ Hello Coffee ~</div>
  `;
  openModal('receiptModal');
}

function printReceipt() {
  const content = document.getElementById('receiptPaper').innerHTML;
  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(`<html><head><title>Struk</title><style>body{font-family:'Courier New',monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}.r-center{text-align:center}.r-brand{font-size:18px;font-weight:700}.r-sub{font-size:10px;color:#666;margin-bottom:12px}.r-line{border-top:1px dashed #ccc;margin:8px 0}.r-row{display:flex;justify-content:space-between;padding:2px 0}.r-item{padding:3px 0}.r-item-name{font-weight:600}.r-total{font-size:16px;font-weight:700}.r-footer{font-size:10px;color:#888;margin-top:12px;text-align:center}@media print{body{margin:0;padding:5px}}</style></head><body>${content}</body></html>`);
  w.document.close();
  w.print();
}

// ==================== ADMIN ====================
function showAdmin() {
  switchScreen('adminScreen');
  loadDashboard();
  loadMenuTable();
  loadHistory();
  loadReports();
}

function hideAdmin() { switchScreen('posScreen'); }

function showAdminTab(tabId, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-nav').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');
}

function loadDashboard() {
  const today = new Date().toDateString();
  const todayTxns = DB.transactions.filter(t => new Date(t.created_at).toDateString() === today && t.status === 'completed');
  const totalRevenue = todayTxns.reduce((s, t) => s + t.total, 0);
  const totalTxns = todayTxns.length;
  const avgTxn = totalTxns > 0 ? Math.round(totalRevenue / totalTxns) : 0;
  const totalItems = todayTxns.reduce((s, t) => s + t.items.reduce((si, i) => si + i.qty, 0), 0);

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Pendapatan Hari Ini</div><div class="stat-value">${formatRupiah(totalRevenue)}</div><div class="stat-sub">${totalTxns} transaksi</div></div>
    <div class="stat-card"><div class="stat-label">Total Transaksi</div><div class="stat-value">${totalTxns}</div><div class="stat-sub">hari ini</div></div>
    <div class="stat-card"><div class="stat-label">Rata-rata Transaksi</div><div class="stat-value">${formatRupiah(avgTxn)}</div><div class="stat-sub">per transaksi</div></div>
    <div class="stat-card"><div class="stat-label">Item Terjual</div><div class="stat-value">${totalItems}</div><div class="stat-sub">hari ini</div></div>
  `;

  // Simple hourly chart
  const hours = {};
  for (let h = 7; h <= 22; h++) hours[h] = 0;
  todayTxns.forEach(t => { const h = new Date(t.created_at).getHours(); if (hours[h] !== undefined) hours[h] += t.total; });
  const maxVal = Math.max(...Object.values(hours), 1);
  document.getElementById('todayChart').innerHTML = Object.entries(hours).map(([h, v]) => {
    const pct = (v / maxVal * 150) + 4;
    return `<div class="chart-bar-wrap"><div class="chart-bar-val">${v > 0 ? (v/1000).toFixed(0)+'k' : ''}</div><div class="chart-bar" style="height:${pct}px"></div><div class="chart-bar-label">${h}:00</div></div>`;
  }).join('');
}

function loadMenuTable() {
  document.getElementById('menuTableBody').innerHTML = DB.products.map(p =>
    `<tr><td><strong>${p.name}</strong></td><td>${getCategoryName(p.category_id)}</td><td>${formatRupiah(p.base_price)}</td>
    <td><span class="badge ${p.is_available ? 'badge-success' : 'badge-danger'}">${p.is_available ? 'Tersedia' : 'Habis'}</span></td>
    <td><button class="btn-sm" onclick="editProduct(${p.id})">Edit</button> <button class="btn-sm btn-sm-danger" onclick="toggleAvail(${p.id})">Toggle</button></td></tr>`
  ).join('');
}

function loadHistory() {
  const txns = [...DB.transactions].reverse();
  document.getElementById('historyTableBody').innerHTML = txns.length === 0 ?
    '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:40px">Belum ada transaksi</td></tr>' :
    txns.map(t => {
      const d = new Date(t.created_at);
      const ds = d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      const itemCount = t.items.reduce((s,i) => s+i.qty, 0);
      return `<tr><td><strong>${t.invoice_no}</strong></td><td>${ds}</td><td>${t.user_name}</td><td>${itemCount} item</td><td>${formatRupiah(t.total)}</td><td>${t.payment_method}</td>
      <td><span class="badge ${t.status==='completed'?'badge-success':'badge-danger'}">${t.status}</span></td></tr>`;
    }).join('');
}

function loadReports() {
  const txns = DB.transactions.filter(t => t.status === 'completed');
  const totalRev = txns.reduce((s,t) => s+t.total, 0);

  // Top products
  const prodCount = {};
  txns.forEach(t => t.items.forEach(i => { const k = i.name; prodCount[k] = (prodCount[k]||0) + i.qty; }));
  const topProds = Object.entries(prodCount).sort((a,b) => b[1]-a[1]).slice(0,5);

  // Payment methods
  const methCount = {};
  txns.forEach(t => { methCount[t.payment_method] = (methCount[t.payment_method]||0) + 1; });

  document.getElementById('reportCards').innerHTML = `
    <div class="report-card"><h4>📊 Ringkasan</h4><ul class="report-list">
      <li><span>Total Pendapatan</span><span class="rl-val">${formatRupiah(totalRev)}</span></li>
      <li><span>Total Transaksi</span><span class="rl-val">${txns.length}</span></li>
      <li><span>Rata-rata</span><span class="rl-val">${formatRupiah(txns.length?Math.round(totalRev/txns.length):0)}</span></li>
    </ul></div>
    <div class="report-card"><h4>🏆 Produk Terlaris</h4><ul class="report-list">
      ${topProds.length ? topProds.map(([n,q]) => `<li><span>${n}</span><span class="rl-val">${q}x</span></li>`).join('') : '<li><span>Belum ada data</span><span></span></li>'}
    </ul></div>
    <div class="report-card"><h4>💳 Metode Pembayaran</h4><ul class="report-list">
      ${Object.entries(methCount).map(([m,c]) => `<li><span>${m}</span><span class="rl-val">${c}x</span></li>`).join('') || '<li><span>Belum ada data</span><span></span></li>'}
    </ul></div>
    <div class="report-card"><h4>📅 Info</h4><ul class="report-list">
      <li><span>Total Produk</span><span class="rl-val">${DB.products.length}</span></li>
      <li><span>Kategori</span><span class="rl-val">${DB.categories.length}</span></li>
      <li><span>User Aktif</span><span class="rl-val">${DB.users.filter(u=>u.is_active).length}</span></li>
    </ul></div>
  `;
}

// ==================== PRODUCT MGMT ====================
function openAddProduct() {
  document.getElementById('editProductId').value = '';
  document.getElementById('addProductTitle').textContent = 'Tambah Produk Baru';
  document.getElementById('prodName').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodAvailable').checked = true;
  const sel = document.getElementById('prodCategory');
  sel.innerHTML = DB.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  openModal('addProductModal');
}

function editProduct(id) {
  const p = DB.products.find(pr => pr.id === id);
  if (!p) return;
  document.getElementById('editProductId').value = id;
  document.getElementById('addProductTitle').textContent = 'Edit Produk';
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodPrice').value = p.base_price;
  document.getElementById('prodAvailable').checked = p.is_available;
  const sel = document.getElementById('prodCategory');
  sel.innerHTML = DB.categories.map(c => `<option value="${c.id}" ${c.id===p.category_id?'selected':''}>${c.name}</option>`).join('');
  openModal('addProductModal');
}

function saveProduct() {
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value.trim();
  const catId = parseInt(document.getElementById('prodCategory').value);
  const price = parseInt(document.getElementById('prodPrice').value);
  const avail = document.getElementById('prodAvailable').checked;
  if (!name || !price) { showToast('Lengkapi semua field!', 'error'); return; }

  if (id) {
    const p = DB.products.find(pr => pr.id === parseInt(id));
    if (p) { p.name = name; p.category_id = catId; p.base_price = price; p.is_available = avail; }
  } else {
    DB.products.push({ id: DB.products.length + 1, category_id: catId, name, base_price: price, image: '', is_available: avail });
  }
  saveData();
  closeModalById('addProductModal');
  loadMenuTable();
  renderProducts();
  showToast('Produk berhasil disimpan!', 'success');
}

function toggleAvail(id) {
  const p = DB.products.find(pr => pr.id === id);
  if (p) { p.is_available = !p.is_available; saveData(); loadMenuTable(); renderProducts(); }
}

// ==================== MODALS ====================
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModalById(id) { document.getElementById(id).classList.remove('show'); }
function closeModal(e, id) { if (e.target === e.currentTarget) closeModalById(id); }

// ==================== TOAST ====================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}
