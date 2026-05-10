// ==================== DATABASE SIMULASI ====================
const DB = {
  users: [
    { id: 1, name: 'Kasir 1', role: 'kasir', pin: '1234', is_active: true },
    { id: 2, name: 'Admin', role: 'admin', pin: '0000', is_active: true },
  ],
  categories: [
    { id: 1, name: 'Kopi', icon: '☕', sort_order: 1 },
    { id: 2, name: 'Non-Kopi', icon: '🧋', sort_order: 2 },
    { id: 3, name: 'Makanan', icon: '🍞', sort_order: 3 },
    { id: 4, name: 'Snack', icon: '🍪', sort_order: 4 },
  ],
  products: [
    { id: 1, category_id: 1, name: 'Espresso', base_price: 18000, image: '', is_available: true },
    { id: 2, category_id: 1, name: 'Americano', base_price: 22000, image: '', is_available: true },
    { id: 3, category_id: 1, name: 'Cappuccino', base_price: 28000, image: '', is_available: true },
    { id: 4, category_id: 1, name: 'Caffe Latte', base_price: 28000, image: '', is_available: true },
    { id: 5, category_id: 1, name: 'Mocha Latte', base_price: 32000, image: '', is_available: true },
    { id: 6, category_id: 1, name: 'Vanilla Latte', base_price: 32000, image: '', is_available: true },
    { id: 7, category_id: 1, name: 'Hazelnut Latte', base_price: 32000, image: '', is_available: true },
    { id: 8, category_id: 1, name: 'Caramel Macchiato', base_price: 35000, image: '', is_available: true },
    { id: 9, category_id: 2, name: 'Matcha Latte', base_price: 30000, image: '', is_available: true },
    { id: 10, category_id: 2, name: 'Taro Latte', base_price: 28000, image: '', is_available: true },
    { id: 11, category_id: 2, name: 'Red Velvet', base_price: 30000, image: '', is_available: true },
    { id: 12, category_id: 2, name: 'Chocolate', base_price: 25000, image: '', is_available: true },
    { id: 13, category_id: 2, name: 'Thai Tea', base_price: 22000, image: '', is_available: true },
    { id: 14, category_id: 2, name: 'Lemon Tea', base_price: 18000, image: '', is_available: true },
    { id: 15, category_id: 3, name: 'Croissant', base_price: 25000, image: '', is_available: true },
    { id: 16, category_id: 3, name: 'Sandwich', base_price: 30000, image: '', is_available: true },
    { id: 17, category_id: 3, name: 'Toast Bread', base_price: 22000, image: '', is_available: true },
    { id: 18, category_id: 3, name: 'French Fries', base_price: 20000, image: '', is_available: true },
    { id: 19, category_id: 4, name: 'Cookies', base_price: 15000, image: '', is_available: true },
    { id: 20, category_id: 4, name: 'Brownies', base_price: 18000, image: '', is_available: true },
    { id: 21, category_id: 4, name: 'Banana Cake', base_price: 20000, image: '', is_available: true },
  ],
  product_variants: [
    { id: 1, product_id: 2, name: 'Hot', price_adjustment: 0 },
    { id: 2, product_id: 2, name: 'Ice', price_adjustment: 3000 },
    { id: 3, product_id: 3, name: 'Hot', price_adjustment: 0 },
    { id: 4, product_id: 3, name: 'Ice', price_adjustment: 3000 },
    { id: 5, product_id: 4, name: 'Hot', price_adjustment: 0 },
    { id: 6, product_id: 4, name: 'Ice', price_adjustment: 3000 },
    { id: 7, product_id: 5, name: 'Hot', price_adjustment: 0 },
    { id: 8, product_id: 5, name: 'Ice', price_adjustment: 3000 },
    { id: 9, product_id: 6, name: 'Hot', price_adjustment: 0 },
    { id: 10, product_id: 6, name: 'Ice', price_adjustment: 3000 },
    { id: 11, product_id: 7, name: 'Hot', price_adjustment: 0 },
    { id: 12, product_id: 7, name: 'Ice', price_adjustment: 3000 },
    { id: 13, product_id: 8, name: 'Hot', price_adjustment: 0 },
    { id: 14, product_id: 8, name: 'Ice', price_adjustment: 3000 },
    { id: 15, product_id: 9, name: 'Hot', price_adjustment: 0 },
    { id: 16, product_id: 9, name: 'Ice', price_adjustment: 3000 },
    { id: 17, product_id: 10, name: 'Hot', price_adjustment: 0 },
    { id: 18, product_id: 10, name: 'Ice', price_adjustment: 3000 },
  ],
  transactions: [],
  shifts: [],
};

// ==================== HELPER FUNCTIONS ====================
function generateInvoiceNo() {
  const d = new Date();
  const prefix = 'INV';
  const date = d.getFullYear().toString().slice(-2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const seq = String(DB.transactions.length + 1).padStart(4, '0');
  return `${prefix}-${date}-${seq}`;
}

function formatRupiah(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

function getProductsByCategory(catId) {
  if (catId === 0) return DB.products.filter(p => p.is_available);
  return DB.products.filter(p => p.category_id === catId && p.is_available);
}

function getVariants(productId) {
  return DB.product_variants.filter(v => v.product_id === productId);
}

function getCategoryName(catId) {
  const cat = DB.categories.find(c => c.id === catId);
  return cat ? cat.name : '';
}

// Load from localStorage
function loadData() {
  const saved = localStorage.getItem('helloCoffeDB');
  if (saved) {
    const parsed = JSON.parse(saved);
    DB.transactions = parsed.transactions || [];
    DB.products = parsed.products || DB.products;
    DB.categories = parsed.categories || DB.categories;
    DB.shifts = parsed.shifts || [];
    DB.users = parsed.users || DB.users;
  }
}

function saveData() {
  localStorage.setItem('helloCoffeDB', JSON.stringify(DB));
}

loadData();
