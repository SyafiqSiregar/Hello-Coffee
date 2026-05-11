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
    <div class="r-center"><img src="hello%20putih.png" alt="Logo" style="width: 54px; height: auto; margin: 0 auto 6px; display: block;"><div class="r-brand">Hello Coffee</div><div class="r-sub">Jl. Kopi Nikmat No. 123</div></div>
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
  setTimeout(() => w.print(), 500);
}

// ==================== ADMIN ====================
function showAdmin() {
  switchScreen('adminScreen');
  loadDashboard();
  loadMenuTable();
  loadHistory();
  loadReports();
  loadUsers();
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

  // Weekly chart (Current Week: Senin - Minggu)
  const days = [];
  const daysData = {};
  
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - distanceToMonday);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const fullDateStr = d.toDateString();
    const shortDay = d.toLocaleDateString('id-ID', { weekday: 'short' });
    days.push({ full: fullDateStr, label: shortDay });
    daysData[fullDateStr] = 0;
  }

  DB.transactions.forEach(t => {
    if (t.status === 'completed') {
      const dStr = new Date(t.created_at).toDateString();
      if (daysData[dStr] !== undefined) {
        daysData[dStr] += t.total;
      }
    }
  });

  const maxVal = Math.max(...Object.values(daysData), 1);
  document.getElementById('todayChart').innerHTML = days.map(d => {
    const v = daysData[d.full];
    const pct = (v / maxVal * 150) + 4;
    return `<div class="chart-bar-wrap"><div class="chart-bar-val">${v > 0 ? (v/1000).toFixed(0)+'k' : ''}</div><div class="chart-bar" style="height:${pct}px"></div><div class="chart-bar-label">${d.label}</div></div>`;
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
    '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:40px">Belum ada transaksi</td></tr>' :
    txns.map(t => {
      const d = new Date(t.created_at);
      const ds = d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      const itemCount = t.items.reduce((s,i) => s+i.qty, 0);
      const tipe = t.order_type === 'dinein' ? 'Dine In' : 'Take Away';
      const actionBtn = t.status === 'completed' 
        ? `<button class="btn-sm btn-sm-danger" onclick="cancelTransaction(${t.id})">Batalkan</button>`
        : `<span style="font-size:12px;color:var(--text3)">Dibatalkan</span>`;
      return `<tr><td><strong>${t.invoice_no}</strong></td><td>${ds}</td><td>${t.user_name}</td><td>${tipe}</td><td>${itemCount} item</td><td>${formatRupiah(t.total)}</td><td>${t.payment_method}</td>
      <td><span class="badge ${t.status==='completed'?'badge-success':'badge-danger'}">${t.status}</span></td><td>${actionBtn}</td></tr>`;
    }).join('');
}

function cancelTransaction(txnId) {
  const txn = DB.transactions.find(t => t.id === txnId);
  if (!txn || txn.status === 'cancelled') return;

  const pin = prompt(`Masukkan PIN Admin untuk membatalkan transaksi ${txn.invoice_no}:`);
  if (pin === null) return;

  const admin = DB.users.find(u => u.role === 'admin' && u.pin === pin);
  if (!admin) {
    showToast('PIN Admin salah! Pembatalan ditolak.', 'error');
    return;
  }

  if (confirm(`Yakin ingin membatalkan transaksi ${txn.invoice_no} senilai ${formatRupiah(txn.total)}?`)) {
    txn.status = 'cancelled';
    showToast('Transaksi berhasil dibatalkan!', 'success');
    loadHistory();
    loadDashboard();
    loadReports();
  }
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

  // Order types
  const typeCount = {};
  txns.forEach(t => { typeCount[t.order_type] = (typeCount[t.order_type]||0) + 1; });

  document.getElementById('reportCards').innerHTML = `
    <div class="report-card"><h4>📊 Ringkasan</h4><ul class="report-list">
      <li><span>Total Pendapatan</span><span class="rl-val">${formatRupiah(totalRev)}</span></li>
      <li><span>Total Transaksi</span><span class="rl-val">${txns.length}</span></li>
      <li><span>Rata-rata</span><span class="rl-val">${formatRupiah(txns.length?Math.round(totalRev/txns.length):0)}</span></li>
    </ul></div>
    <div class="report-card"><h4>🏆 Produk Terlaris</h4><ul class="report-list">
      ${topProds.length ? topProds.map(([n,q]) => `<li><span>${n}</span><span class="rl-val">${q}x</span></li>`).join('') : '<li><span>Belum ada data</span><span></span></li>'}
    </ul></div>
    <div class="report-card"><h4>🍽️ Tipe Pesanan</h4><ul class="report-list">
      <li><span>Dine In</span><span class="rl-val">${typeCount['dinein'] || 0}x</span></li>
      <li><span>Take Away</span><span class="rl-val">${typeCount['takeaway'] || 0}x</span></li>
    </ul></div>
    <div class="report-card"><h4>💳 Metode Pembayaran</h4><ul class="report-list">
      ${Object.entries(methCount).map(([m,c]) => `<li><span>${m}</span><span class="rl-val">${c}x</span></li>`).join('') || '<li><span>Belum ada data</span><span></span></li>'}
    </ul></div>
  `;
}

// ==================== EXPORT REPORTS & HISTORY ====================
function exportHistoryExcel() {
  const txns = DB.transactions.map(t => {
    const d = new Date(t.created_at);
    const dateStr = d.toLocaleDateString('id-ID',{day:'2-digit',month:'short', year:'numeric'}) + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const itemCount = t.items.reduce((s,i) => s+i.qty, 0);
    return {
      'Invoice': t.invoice_no,
      'Tanggal': dateStr,
      'Kasir': t.user_name,
      'Tipe Pesanan': t.order_type === 'dinein' ? 'Dine In' : 'Take Away',
      'Jml Item': itemCount,
      'Subtotal': t.subtotal,
      'Diskon': t.discount,
      'Pajak': t.tax,
      'Total': t.total,
      'Metode': t.payment_method,
      'Status': t.status
    };
  });
  
  if (txns.length === 0) { showToast('Tidak ada data transaksi!', 'error'); return; }

  const ws = XLSX.utils.json_to_sheet(txns);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat Transaksi");
  XLSX.writeFile(wb, "Riwayat_Transaksi_HelloCoffee.xlsx");
}

function exportHistoryPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const tableData = DB.transactions.map(t => {
    const d = new Date(t.created_at);
    const dateStr = d.toLocaleDateString('id-ID',{day:'2-digit',month:'short', year:'numeric'}) + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const itemCount = t.items.reduce((s,i) => s+i.qty, 0);
    return [t.invoice_no, dateStr, t.user_name, t.order_type === 'dinein' ? 'Dine In' : 'Take Away', itemCount, formatRupiah(t.total), t.payment_method, t.status];
  });

  if (tableData.length === 0) { showToast('Tidak ada data transaksi!', 'error'); return; }

  const processPDF = (img) => {
    // KOP SURAT
    if (img) {
      doc.addImage(img, 'PNG', 14, 12, 24, 24);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HELLO COFFEE", 42, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Kopi Nikmat No. 123, Jakarta Selatan", 42, 26);
      doc.text("Telp: 0812-3456-7890 | Email: hello@coffee.com", 42, 31);
    } else {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HELLO COFFEE", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Kopi Nikmat No. 123, Jakarta Selatan", 14, 26);
      doc.text("Telp: 0812-3456-7890 | Email: hello@coffee.com", 14, 31);
    }
    
    // Garis Kop
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Riwayat Transaksi", 105, 48, null, null, "center");

    doc.autoTable({
      head: [['Invoice', 'Tanggal', 'Kasir', 'Tipe', 'Items', 'Total', 'Metode', 'Status']],
      body: tableData,
      startY: 54,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    doc.save("Riwayat_Transaksi_HelloCoffee.pdf");
  };

  const img = new Image();
  img.src = 'hello%20putih.png';
  img.onload = () => processPDF(img);
  img.onerror = () => processPDF(null);
}

function exportReportExcel() {
  const txns = DB.transactions.filter(t => t.status === 'completed');
  if (txns.length === 0) { showToast('Tidak ada data laporan!', 'error'); return; }
  
  const totalRev = txns.reduce((s,t) => s+t.total, 0);
  
  // Top products
  const prodCount = {};
  txns.forEach(t => t.items.forEach(i => { const k = i.name; prodCount[k] = (prodCount[k]||0) + i.qty; }));
  const topProds = Object.entries(prodCount).sort((a,b) => b[1]-a[1]).map(p => ({ 'Produk': p[0], 'Terjual': p[1] }));

  const wsSummary = XLSX.utils.json_to_sheet([
    { 'Keterangan': 'Total Pendapatan', 'Nilai': totalRev },
    { 'Keterangan': 'Total Transaksi', 'Nilai': txns.length },
    { 'Keterangan': 'Rata-rata Transaksi', 'Nilai': Math.round(totalRev/txns.length) }
  ]);

  const wsProducts = XLSX.utils.json_to_sheet(topProds);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
  XLSX.utils.book_append_sheet(wb, wsProducts, "Produk Terlaris");
  
  XLSX.writeFile(wb, "Laporan_Penjualan_HelloCoffee.xlsx");
}

function exportReportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const txns = DB.transactions.filter(t => t.status === 'completed');
  if (txns.length === 0) { showToast('Tidak ada data laporan!', 'error'); return; }
  
  const totalRev = txns.reduce((s,t) => s+t.total, 0);
  
  const processPDF = (img) => {
    // KOP SURAT
    if (img) {
      doc.addImage(img, 'PNG', 14, 12, 24, 24);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HELLO COFFEE", 42, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Kopi Nikmat No. 123, Jakarta Selatan", 42, 26);
      doc.text("Telp: 0812-3456-7890 | Email: hello@coffee.com", 42, 31);
    } else {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HELLO COFFEE", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Kopi Nikmat No. 123, Jakarta Selatan", 14, 26);
      doc.text("Telp: 0812-3456-7890 | Email: hello@coffee.com", 14, 31);
    }
    
    // Garis Kop
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Penjualan Keseluruhan", 105, 48, null, null, "center");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Pendapatan: ${formatRupiah(totalRev)}`, 14, 58);
    doc.text(`Total Transaksi: ${txns.length}`, 14, 64);
    doc.text(`Rata-rata Transaksi: ${formatRupiah(Math.round(totalRev/txns.length))}`, 14, 70);
    
    // Top products
    const prodCount = {};
    txns.forEach(t => t.items.forEach(i => { const k = i.name; prodCount[k] = (prodCount[k]||0) + i.qty; }));
    const topProds = Object.entries(prodCount).sort((a,b) => b[1]-a[1]).map(p => [p[0], p[1] + 'x']);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Produk Terlaris:", 14, 82);
    doc.autoTable({
      head: [['Nama Produk', 'Jumlah Terjual']],
      body: topProds,
      startY: 86,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    
    doc.save("Laporan_Penjualan_HelloCoffee.pdf");
  };

  const img = new Image();
  img.src = 'hello%20putih.png';
  img.onload = () => processPDF(img);
  img.onerror = () => processPDF(null);
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

// ==================== USER MGMT ====================
function loadUsers() {
  document.getElementById('userTableBody').innerHTML = DB.users.map(u => {
    const avatar = u.name.charAt(0).toUpperCase();
    const rolePill = u.role === 'admin' 
      ? '<span style="background:rgba(200,149,108,0.15); color:var(--accent); padding:4px 10px; border-radius:100px; font-size:11px; font-weight:600; letter-spacing:0.5px;">Admin</span>' 
      : '<span style="background:rgba(255,255,255,0.1); color:var(--text2); padding:4px 10px; border-radius:100px; font-size:11px; font-weight:600; letter-spacing:0.5px;">Kasir</span>';
    const statusPill = u.is_active 
      ? '<span style="background:rgba(16,124,65,0.2); color:#4ade80; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:600;">Aktif</span>' 
      : '<span style="background:rgba(255,255,255,0.05); color:var(--text3); padding:4px 10px; border-radius:100px; font-size:11px; font-weight:600;">Nonaktif</span>';
      
    return `
    <tr style="transition:background 0.2s">
      <td style="color:var(--text3)">US-${u.id}</td>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; border-radius:50%; background:var(--bg-input); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--text2); border:1px solid var(--border2)">${avatar}</div>
          <strong style="font-size:14px; font-weight:600; color:var(--text)">${u.name}</strong>
        </div>
      </td>
      <td>${rolePill}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <span id="pin-display-${u.id}" style="font-family:monospace; font-size:14px; letter-spacing:2px; color:var(--text2)">••••</span>
          <button onclick="togglePinVisibility(${u.id}, '${u.pin}')" style="background:none; border:none; color:var(--text3); cursor:pointer; display:flex; align-items:center; padding:0" title="Tampilkan PIN">
            <svg id="pin-icon-${u.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </td>
      <td>${statusPill}</td>
      <td>
        <button class="btn-sm" style="background:transparent; border:1px solid ${u.is_active ? 'var(--border2)' : 'var(--accent)'}; color:${u.is_active ? 'var(--text3)' : 'var(--accent)'}; font-weight:600; border-radius:6px; transition:0.2s" onclick="toggleUserStatus(${u.id})" onmouseover="this.style.background='${u.is_active ? 'rgba(227,36,43,0.1)' : 'rgba(200,149,108,0.1)'}'; this.style.color='${u.is_active ? 'var(--danger)' : 'var(--accent)'}'; this.style.borderColor='${u.is_active ? 'var(--danger)' : 'var(--accent)'}'" onmouseout="this.style.background='transparent'; this.style.color='${u.is_active ? 'var(--text3)' : 'var(--accent)'}'; this.style.borderColor='${u.is_active ? 'var(--border2)' : 'var(--accent)'}'">
          ${u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </td>
    </tr>
  `;
  }).join('');
}

function togglePinVisibility(id, pin) {
  const el = document.getElementById('pin-display-' + id);
  const icon = document.getElementById('pin-icon-' + id);
  if (el.textContent === '••••') {
    el.textContent = pin;
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    el.textContent = '••••';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

function openUserModal() {
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserPin').value = '';
  document.getElementById('newUserRole').value = 'kasir';
  openModal('userModal');
}

function saveUser() {
  const name = document.getElementById('newUserName').value.trim();
  const pin = document.getElementById('newUserPin').value.trim();
  const role = document.getElementById('newUserRole').value;

  if (!name || pin.length !== 4) {
    showToast('Nama harus diisi dan PIN harus 4 angka!', 'error');
    return;
  }

  DB.users.push({
    id: DB.users.length + 1,
    name: name,
    role: role,
    pin: pin,
    is_active: true
  });

  showToast('Kasir baru berhasil ditambahkan!', 'success');
  populateLoginUsers(); // Refresh login dropdown
  loadUsers();          // Refresh admin table
  closeModalById('userModal');
}

function toggleUserStatus(id) {
  const u = DB.users.find(x => x.id === id);
  if (!u) return;

  // Prevent disabling the current admin if they are logged in
  if (currentUser && u.id === currentUser.id) {
    showToast('Anda tidak bisa menonaktifkan akun yang sedang digunakan!', 'error');
    return;
  }

  u.is_active = !u.is_active;
  showToast('Status kasir berhasil diubah!', 'success');
  populateLoginUsers();
  loadUsers();
}
