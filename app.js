const key = 'mini-maker-shop-v3';
const defaults = {
  products: [],
  records: [],
  orders: [],
  activities: [],
  photoLibrary: [],
  settings: { lowStockLimit: 2, adultPin: '' }
};

const supabaseUrl = (window.MINI_MAKER_SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseAnonKey = (window.MINI_MAKER_SUPABASE_ANON_KEY || '').trim();
const hasSharedInventory = Boolean(supabaseUrl && supabaseAnonKey);

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const today = () => new Date().toISOString().slice(0, 10);
const samplePhoto = (title, hueA, hueB, emoji) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${hueA}"/><stop offset="1" stop-color="${hueB}"/></linearGradient></defs><rect width="512" height="512" rx="48" fill="url(#g)"/><circle cx="256" cy="200" r="120" fill="rgba(255,255,255,0.18)"/><text x="256" y="245" text-anchor="middle" font-size="132">${emoji}</text><text x="256" y="390" text-anchor="middle" font-size="38" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">${title}</text></svg>`)}`;
const sampleColorPhoto = (label, hue) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="30" fill="${hue}"/><circle cx="120" cy="105" r="58" fill="rgba(255,255,255,0.22)"/><text x="120" y="205" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">${label}</text></svg>`)}`;
const sampleProducts = [
  { id: crypto.randomUUID(), name: 'Dragon', qty: 6, price: 5, photo: samplePhoto('Dragon', '#ff8a65', '#ff5252', '🐉'), variants: [{ color: 'Red', photo: sampleColorPhoto('Red', '#ff4d4d'), price: 5 }, { color: 'Blue', photo: sampleColorPhoto('Blue', '#4d79ff'), price: 6 }, { color: 'Glow', photo: sampleColorPhoto('Glow', '#c7ff6b'), price: 7 }] },
  { id: crypto.randomUUID(), name: 'Robot', qty: 4, price: 6, photo: samplePhoto('Robot', '#64b5f6', '#5c6bc0', '🤖'), variants: [{ color: 'Silver', photo: sampleColorPhoto('Silver', '#cfd8dc'), price: 6 }, { color: 'Gold', photo: sampleColorPhoto('Gold', '#ffd54f'), price: 7 }] },
  { id: crypto.randomUUID(), name: 'Dinosaur', qty: 5, price: 5, photo: samplePhoto('Dinosaur', '#81c784', '#43a047', '🦖'), variants: [{ color: 'Green', photo: sampleColorPhoto('Green', '#66bb6a'), price: 5 }, { color: 'Purple', photo: sampleColorPhoto('Purple', '#ab47bc'), price: 6 }] },
  { id: crypto.randomUUID(), name: 'Rocket', qty: 3, price: 8, photo: samplePhoto('Rocket', '#90caf9', '#ef5350', '🚀'), variants: [{ color: 'White', photo: sampleColorPhoto('White', '#f5f5f5'), price: 8 }, { color: 'Black', photo: sampleColorPhoto('Black', '#424242'), price: 9 }] }
];

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem('mini-maker-shop-v2') || '{}');
    return {
      ...defaults,
      ...saved,
      products: Array.isArray(saved.products) ? saved.products : [],
      records: Array.isArray(saved.records) ? saved.records : [],
      orders: Array.isArray(saved.orders) ? saved.orders : [],
      activities: Array.isArray(saved.activities) ? saved.activities : [],
      photoLibrary: Array.isArray(saved.photoLibrary) ? saved.photoLibrary : [],
      settings: { ...defaults.settings, ...(saved.settings || {}) }
    };
  } catch {
    return structuredClone(defaults);
  }
}

let state = readState();
let photoData = '';
let orderProduct = null;
let accessUnlocked = false;
let draftVariants = [];
let draftColorPhoto = '';

const save = () => localStorage.setItem(key, JSON.stringify(state));

function show(id, message, type = '') {
  const element = $(id);
  if (!element) return;
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

function switchView(id) {
  const target = $(id);
  if (!target) return;
  if (id === 'money' && !accessUnlocked && !requestAccess()) return;
  if (id === 'money' && $('privateReport')) $('privateReport').hidden = false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addActivity(message) {
  state.activities.unshift({ id: crypto.randomUUID(), at: new Date().toLocaleString(), message });
  state.activities = state.activities.slice(0, 20);
  save();
}

function productFromRow(row) {
  const variants = Array.isArray(row.variants) ? row.variants.map(variant => ({
    ...variant,
    photo: variant.photo || variant.hex ? variant.photo || sampleColorPhoto(variant.color || 'Color', variant.hex || '#dff8ee') : ''
  })) : [];
  return { id: row.id, name: row.name, qty: Number(row.qty), price: Number(row.price), photo: row.photo || '', variants: variants.length ? variants : [{ color: 'Standard', price: Number(row.price) }] };
}

function recordFromRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.product_name,
    qty: Number(row.qty),
    price: Number(row.price || 0),
    color: row.color || 'Standard',
    buyer: row.buyer || '',
    date: row.occurred_on || today(),
    recordType: row.record_type
  };
}

function orderFromRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.product_name,
    qty: Number(row.qty),
    color: row.color || 'Standard',
    customer: row.customer_name,
    contact: row.contact,
    note: row.note || '',
    status: row.status,
    createdAt: row.created_at
  };
}

function orderStatusLabel(status) {
  return ({
    pending: 'Pending print',
    pending_print: 'Pending print',
    ready_for_pickup: 'Ready for pickup',
    fulfilled: 'Completed',
    completed: 'Completed',
    cancelled: 'Cancelled'
  })[status] || status;
}

function isOpenOrder(status) {
  return ['pending', 'pending_print', 'ready_for_pickup'].includes(status);
}

async function supabaseRequest(path, options = {}) {
  const { method = 'GET', body, prefer } = options;
  const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    let message = `Shared inventory request failed (${response.status}).`;
    try {
      const error = await response.json();
      message = error.message || error.error_description || error.hint || message;
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function requestInventory(options = {}) {
  const method = options.method || 'GET';
  if (hasSharedInventory) {
    const input = options.body ? JSON.parse(options.body) : {};
    if (method === 'GET') {
      const rows = await supabaseRequest('inventory_items?select=id,name,qty,price,photo,variants,created_at&order=created_at.asc');
      return rows.map(productFromRow);
    }
    if (method === 'POST') {
      const payload = { id: input.id || crypto.randomUUID(), name: input.name, qty: input.qty, price: input.price, photo: input.photo || '', variants: input.variants || [] };
      const rows = await supabaseRequest('inventory_items?select=id,name,qty,price,photo,variants,created_at', { method: 'POST', body: payload, prefer: 'return=representation' });
      return productFromRow(rows[0]);
    }
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(input, 'qty')) payload.qty = input.qty;
    if (typeof input.photo === 'string') payload.photo = input.photo;
    if (Array.isArray(input.variants)) payload.variants = input.variants;
    const rows = await supabaseRequest(`inventory_items?id=eq.${encodeURIComponent(input.id)}&select=id,name,qty,price,photo,variants,created_at`, { method: 'PATCH', body: payload, prefer: 'return=representation' });
    if (!rows.length) throw new Error('Toy not found.');
    return productFromRow(rows[0]);
  }
  if (method === 'GET') return structuredClone(state.products);
  const input = JSON.parse(options.body || '{}');
  if (method === 'POST') return { ...input, id: crypto.randomUUID() };
  const product = state.products.find(item => item.id === input.id);
  if (!product) throw new Error('Toy not found.');
  return { ...product, ...(Object.prototype.hasOwnProperty.call(input, 'qty') ? { qty: input.qty } : {}), ...(typeof input.photo === 'string' ? { photo: input.photo } : {}) };
}

async function requestRecords(options = {}) {
  const method = options.method || 'GET';
  if (hasSharedInventory) {
    const input = options.body ? JSON.parse(options.body) : {};
    if (method === 'GET') {
      const rows = await supabaseRequest('sale_events?select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at&order=created_at.desc');
      return rows.map(recordFromRow);
    }
    if (method === 'POST') {
      const payload = {
        id: input.id || crypto.randomUUID(),
        product_id: input.productId,
        product_name: input.name,
        qty: input.qty,
        price: input.price || 0,
        color: input.color || 'Standard',
        buyer: input.buyer || '',
        record_type: input.recordType,
        occurred_on: input.date || today()
      };
      const rows = await supabaseRequest('sale_events?select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at', { method: 'POST', body: payload, prefer: 'return=representation' });
      return recordFromRow(rows[0]);
    }
    return null;
  }
  if (method === 'GET') return structuredClone(state.records);
  const input = JSON.parse(options.body || '{}');
  return { ...input, id: input.id || crypto.randomUUID() };
}

async function requestOrders(options = {}) {
  const method = options.method || 'GET';
  if (hasSharedInventory) {
    const input = options.body ? JSON.parse(options.body) : {};
    if (method === 'GET') {
      const rows = await supabaseRequest('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at,updated_at&order=created_at.desc');
      return rows.map(orderFromRow);
    }
    if (method === 'POST') {
      const payload = {
        id: input.id || crypto.randomUUID(),
        product_id: input.productId,
        product_name: input.name,
        qty: input.qty,
        color: input.color || 'Standard',
        customer_name: input.customer,
        contact: input.contact,
        note: input.note || '',
        status: input.status || 'pending_print'
      };
      const rows = await supabaseRequest('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at,updated_at', { method: 'POST', body: payload, prefer: 'return=representation' });
      return orderFromRow(rows[0]);
    }
    const rows = await supabaseRequest(`customer_orders?id=eq.${encodeURIComponent(input.id)}&select=id,product_id,product_name,qty,customer_name,contact,note,status,created_at,updated_at`, {
      method: 'PATCH',
      body: { status: input.status, updated_at: new Date().toISOString() },
      prefer: 'return=representation'
    });
    return orderFromRow(rows[0]);
  }
  if (method === 'GET') return structuredClone(state.orders);
  const input = JSON.parse(options.body || '{}');
  if (method === 'POST') return { ...input, id: input.id || crypto.randomUUID(), status: 'pending_print', createdAt: new Date().toISOString() };
  const order = state.orders.find(item => item.id === input.id);
  return order ? { ...order, status: input.status } : null;
}

function recordTotal(kind) {
  return state.records.filter(record => record.recordType === kind).reduce((sum, record) => sum + record.qty, 0);
}

function salesMoney() {
  return state.records.filter(record => record.recordType === 'sale').reduce((sum, record) => sum + record.price * record.qty, 0);
}

function groupBy(items, keyFn, valueFn = item => item) {
  return items.reduce((map, item) => {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + valueFn(item));
    return map;
  }, new Map());
}

function topEntry(map) {
  let best = null;
  for (const [label, value] of map.entries()) {
    if (!best || value > best.value) best = { label, value };
  }
  return best;
}

function monthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function inventoryAgeSummary() {
  if (!state.products.length) return 'No inventory yet.';
  const ages = state.products.map(product => {
    const createdAt = product.createdAt || product.created_at || new Date().toISOString();
    return monthsBetween(createdAt, new Date().toISOString());
  });
  const oldest = Math.max(...ages);
  const average = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return `Oldest stock: ${oldest} month${oldest === 1 ? '' : 's'} · Average age: ${average.toFixed(1)} months`;
}

function monthlyAverageSalePrice() {
  const sales = state.records.filter(record => record.recordType === 'sale');
  if (!sales.length) return 0;
  const byMonth = groupBy(
    sales,
    record => String(record.date || today()).slice(0, 7),
    record => record.price
  );
  let total = 0;
  for (const value of byMonth.values()) total += value;
  return total / byMonth.size;
}

function reportInsights() {
  const orderCounts = groupBy(state.orders, order => `${order.name} (${order.color})`, order => order.qty);
  const mostOrdered = topEntry(orderCounts);
  const pricedVariants = state.products.flatMap(product => colorOptions(product).map(variant => ({ label: `${product.name} (${variant.color})`, value: variant.price })));
  const mostExpensive = pricedVariants.reduce((best, item) => (!best || item.value > best.value ? item : best), null);
  return {
    mostOrdered: mostOrdered ? `${mostOrdered.label} · ${mostOrdered.value} ordered` : 'No orders yet.',
    mostExpensive: mostExpensive ? `${mostExpensive.label} · ${money(mostExpensive.value)}` : 'No products yet.',
    inventoryAge: inventoryAgeSummary(),
    avgMonthlySalePrice: salesMoney() ? money(monthlyAverageSalePrice()) : '$0.00'
  };
}

function normalizeVariants(fallbackPrice) {
  return draftVariants.length ? structuredClone(draftVariants) : [{ color: 'Standard', photo: '', price: Number(fallbackPrice) || 0 }];
}

function colorOptions(product) {
  return (product?.variants?.length ? product.variants : [{ color: 'Standard', photo: '', price: Number(product?.price || 0) }]);
}

function findVariant(product, color) {
  return colorOptions(product).find(variant => variant.color === color) || colorOptions(product)[0];
}

function fillColorSelect(selectId, product, selectedColor = '') {
  const select = $(selectId);
  const variants = colorOptions(product);
  select.innerHTML = variants.map(variant => `<option value="${esc(variant.color)}">${esc(variant.color)} - ${money(variant.price)}</option>`).join('');
  select.value = selectedColor && variants.some(variant => variant.color === selectedColor) ? selectedColor : variants[0].color;
}

function renderOrderColorPreview() {
  if (!orderProduct || !$('orderColorPreview')) return;
  const variant = findVariant(orderProduct, $('orderColor').value);
  const thumbnail = variant?.photo ? `<img src="${variant.photo}" alt="${esc(variant.color)}" style="width:32px;height:32px;border-radius:999px;object-fit:cover;vertical-align:middle;margin-right:8px">` : '';
  $('orderColorPreview').innerHTML = variant ? `${thumbnail}<span class="badge" style="display:inline-flex;align-items:center">${esc(variant.color)} · ${money(variant.price)} each</span>` : '';
}

function colorChip(variant) {
  const thumbnail = variant.photo ? `<img src="${variant.photo}" alt="${esc(variant.color)}" style="width:18px;height:18px;border-radius:999px;object-fit:cover;vertical-align:middle;margin-right:6px">` : '';
  return `<span class="badge" style="display:inline-flex;align-items:center">${thumbnail}${esc(variant.color)} ${money(variant.price)}</span>`;
}

function renderDraftVariants() {
  const container = $('colorList');
  if (!container) return;
  container.innerHTML = draftVariants.length
    ? draftVariants.map((variant, index) => `<span class="badge" style="display:inline-flex;align-items:center;gap:6px;margin:4px"><img src="${variant.photo || ''}" alt="${esc(variant.color)}" style="width:18px;height:18px;border-radius:999px;object-fit:cover;background:#eee">${esc(variant.color)} ${money(variant.price)} <button type="button" data-remove-color="${index}" style="padding:2px 6px;border-radius:999px">x</button></span>`).join('')
    : '<p class="hint">No colors added yet. Add at least one color.</p>';
  document.querySelectorAll('[data-remove-color]').forEach(button => {
    button.onclick = () => {
      draftVariants.splice(Number(button.dataset.removeColor), 1);
      renderDraftVariants();
    };
  });
}

function resetDraftVariants() {
  draftVariants = [];
  draftColorPhoto = '';
  $('colorName').value = '';
  if ($('colorPhoto')) $('colorPhoto').value = '';
  $('colorPrice').value = '5.00';
  renderDraftVariants();
}

function renderPhotoLibrary() {
  const library = $('photoLibrary');
  if (!library) return;
  library.innerHTML = state.photoLibrary.length
    ? state.photoLibrary.map(photo => `<button type="button" class="shop-card" data-library-photo="${photo.id}"><img class="photo" src="${photo.data}" alt="${esc(photo.label)}"><strong>${esc(photo.label)}</strong></button>`).join('')
    : '<p class="empty">No saved photos yet.</p>';
  document.querySelectorAll('[data-library-photo]').forEach(button => {
    button.onclick = () => {
      const selected = state.photoLibrary.find(photo => photo.id === button.dataset.libraryPhoto);
      if (!selected) return;
      photoData = selected.data;
      $('preview').src = selected.data;
      $('preview').hidden = false;
      $('photoLabel').value = selected.label;
      show('addStatus', `Selected saved photo: ${selected.label}`, 'success');
    };
  });
}

function renderToday() {
  const lowStock = state.products.filter(product => product.qty <= state.settings.lowStockLimit);
  $('welcome').textContent = 'Inventory';
  $('goalMessage').textContent = 'Add toys, keep stock updated, and check what needs restocking.';
  $('checklist').innerHTML = state.products.length
    ? state.products.map(product => `<li><span class="check">${product.qty}</span>${esc(product.name)}</li>`).join('')
    : '<li>Add your first toy to start inventory.</li>';
  $('badges').innerHTML = `<div class="stat mint"><span>Toys in inventory</span><strong>${state.products.length}</strong></div><div class="stat gold"><span>Open orders</span><strong>${state.orders.filter(order => isOpenOrder(order.status)).length}</strong></div><div class="stat"><span>Sold today</span><strong>${state.records.filter(record => record.recordType === 'sale' && record.date === today()).reduce((sum, record) => sum + record.qty, 0)}</strong></div>`;
  $('lowStock').innerHTML = lowStock.length
    ? lowStock.map(product => `<p><span class="badge low">Only ${product.qty} left</span> <b>${esc(product.name)}</b></p>`).join('')
    : '<p class="hint">Nothing is low right now.</p>';
}

function renderCount() {
  $('countList').innerHTML = state.orders.length
    ? state.orders.map(order => `<div class="activity"><b>${esc(order.color)} ${esc(order.name)} x ${order.qty}</b> for ${esc(order.customer)}<br><span class="small">${esc(order.contact)}${order.note ? ` · ${esc(order.note)}` : ''}</span><br><span class="badge ${order.status === 'ready_for_pickup' ? 'low' : ''}">${esc(orderStatusLabel(order.status))}</span>${['pending', 'pending_print'].includes(order.status) ? ` <button data-ready="${order.id}">Mark ready</button>` : ''}${order.status === 'ready_for_pickup' ? ` <button data-fulfill="${order.id}">Complete sale</button>` : ''}</div>`).join('')
    : '<p class="empty">No customer orders yet.</p>';
  document.querySelectorAll('[data-ready]').forEach(button => button.onclick = () => updateOrderStatus(button.dataset.ready, 'ready_for_pickup'));
  document.querySelectorAll('[data-fulfill]').forEach(button => button.onclick = () => fulfillOrder(button.dataset.fulfill));
}

function renderInventory() {
  const products = state.products;
  $('sellToy').innerHTML = products.filter(product => product.qty > 0).map(product => `<option value="${product.id}">${esc(product.name)} - ${product.qty} ready</option>`).join('') || '<option value="">No toys ready yet</option>';
  $('sellPicker').innerHTML = products.filter(product => product.qty > 0).map(product => `<button type="button" class="shop-card" data-sell-pick="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge ${product.qty <= state.settings.lowStockLimit ? 'low' : ''}">${product.qty} ready</span></button>`).join('') || '<p class="empty">No toys ready yet.</p>';
  $('inventory').innerHTML = products.length
    ? products.map(product => `<div class="product"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><div><h3>${esc(product.name)}</h3><p><span class="badge ${product.qty <= state.settings.lowStockLimit ? 'low' : ''}">${product.qty} ready now</span></p><p>Colors: ${colorOptions(product).map(colorChip).join(' ')}</p><div class="two" style="margin-top:10px"><label class="small">Add ready stock<input data-stock-input="${product.id}" type="number" min="1" value="1"></label><button type="button" data-add-stock="${product.id}">+ Add stock</button></div><div style="margin-top:8px">${product.photo ? '' : '<p class="small">No toy photo yet.</p>'}<label class="small">${product.photo ? 'Change toy photo' : 'Add toy photo'}<input data-photo-for="${product.id}" type="file" accept="image/*"></label></div></div></div>`).join('')
    : '<p class="empty">Add your first toy above.</p>';
  $('customerShop').innerHTML = products.map(product => `<button class="shop-card" data-order="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge">From ${money(Math.min(...colorOptions(product).map(variant => variant.price)))}</span><br><span class="small">${product.qty} ready now · any listed color can be ordered</span><div style="margin-top:8px">${colorOptions(product).map(colorChip).join(' ')}</div></button>`).join('') || '<p class="empty">New toys will appear here.</p>';
  document.querySelectorAll('[data-order]').forEach(button => button.onclick = () => openOrder(button.dataset.order));
  document.querySelectorAll('[data-sell-pick]').forEach(button => button.onclick = () => selectSaleToy(button.dataset.sellPick));
  document.querySelectorAll('[data-photo-for]').forEach(input => input.onchange = event => uploadInventoryPhoto(input.dataset.photoFor, event.target.files[0]));
  document.querySelectorAll('[data-add-stock]').forEach(button => button.onclick = () => {
    const input = document.querySelector(`[data-stock-input="${button.dataset.addStock}"]`);
    addInventoryStock(button.dataset.addStock, input?.value);
  });
  if (products.length) updateSaleChoices();
}

function renderActivity() {
  $('activityLog').innerHTML = state.activities.length
    ? state.activities.map(activity => `<div class="activity"><b>${esc(activity.message)}</b><br><span class="small">${esc(activity.at)}</span></div>`).join('')
    : '<p class="empty">Recent updates will show here.</p>';
  $('orders').innerHTML = state.orders.length
    ? state.orders.map(order => `<div class="activity"><b>${esc(order.color)} ${esc(order.name)} x ${order.qty}</b> for ${esc(order.customer)}<br><span class="small">${esc(order.contact)}${order.note ? ` · ${esc(order.note)}` : ''}</span><br><span class="badge ${order.status === 'ready_for_pickup' ? 'low' : ''}">${esc(orderStatusLabel(order.status))}</span></div>`).join('')
    : '<p class="empty">No customer orders yet.</p>';
}

function renderPrivateSummary() {
  if (!$('privateReport')) return;
  const insights = reportInsights();
  $('soldTotal').textContent = recordTotal('sale');
  $('freeTotal').textContent = recordTotal('free');
  $('brokenTotal').textContent = recordTotal('broken');
  $('pendingOrders').textContent = state.orders.filter(order => ['pending', 'pending_print'].includes(order.status)).length;
  $('fulfilledOrders').textContent = state.orders.filter(order => order.status === 'completed' || order.status === 'fulfilled').length;
  $('salesMoney').textContent = money(salesMoney());
  $('mostOrdered').textContent = insights.mostOrdered;
  $('mostExpensive').textContent = insights.mostExpensive;
  $('inventoryAge').textContent = insights.inventoryAge;
  $('avgMonthlySalePrice').textContent = insights.avgMonthlySalePrice;
}

function render() {
  renderToday();
  renderCount();
  renderInventory();
  renderActivity();
  renderPrivateSummary();
  renderPhotoLibrary();
}

async function loadSharedData() {
  try {
    state.products = await requestInventory();
    state.records = await requestRecords();
    state.orders = await requestOrders();
    save();
  } catch (error) {
    show('addStatus', error.message || 'Shared inventory is not ready yet.', 'error');
  }
  render();
}

function setDefaultPrice() {
  if (!$('askingPrice').value) $('askingPrice').value = '5.00';
}

function setNewToyDefaults() {
  setDefaultPrice();
  resetDraftVariants();
}

function loadSampleCatalog() {
  const cloned = structuredClone(sampleProducts);
  state.products = cloned;
  state.photoLibrary = cloned.map(product => ({ id: `${product.id}-photo`, label: `${product.name} sample`, data: product.photo }));
  state.records = [];
  state.orders = [];
  addActivity('Loaded sample 3D toys for testing.');
  save();
  render();
  switchView('today');
}

function ensureSampleCatalogForTesting() {
  if (hasSharedInventory) return;
  if (state.products.length) return;
  const cloned = structuredClone(sampleProducts);
  state.products = cloned;
  state.photoLibrary = cloned.map(product => ({ id: `${product.id}-photo`, label: `${product.name} sample`, data: product.photo }));
  save();
}

function openOrder(id) {
  orderProduct = state.products.find(product => product.id === id);
  if (!orderProduct) return;
  $('orderTitle').textContent = `Order ${orderProduct.name}`;
  $('orderPhoto').src = orderProduct.photo || '';
  $('orderQty').value = '1';
  $('orderQty').removeAttribute('max');
  $('orderInventoryHint').textContent = `${orderProduct.qty} ready now. Customers can still request any listed color, and you can print more if needed.`;
  fillColorSelect('orderColor', orderProduct);
  renderOrderColorPreview();
  $('orderDialog').showModal();
}

function compressedPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const size = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * size));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * size));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };
    image.src = url;
  });
}

async function uploadInventoryPhoto(id, file) {
  const product = state.products.find(item => item.id === id);
  if (!product || !file) return;
  try {
    const photo = await compressedPhoto(file);
    const updated = await requestInventory({ method: 'PATCH', body: JSON.stringify({ id, photo }) });
    Object.assign(product, updated);
    addActivity(`Added a photo for ${product.name}.`);
    render();
  } catch (error) {
    alert(error.message || 'That photo could not be added.');
  }
}

async function addInventoryStock(id, amount) {
  const product = state.products.find(item => item.id === id);
  const qtyToAdd = Number(amount);
  if (!product || !Number.isFinite(qtyToAdd) || qtyToAdd <= 0) return alert('Enter how many ready toys you want to add.');
  try {
    const updated = await requestInventory({ method: 'PATCH', body: JSON.stringify({ id, qty: product.qty + qtyToAdd }) });
    Object.assign(product, updated);
    addActivity(`Added ${qtyToAdd} more ${product.name}.`);
    save();
    render();
  } catch (error) {
    alert(error.message || 'Could not add stock.');
  }
}

async function createRecordAndReduce(product, qty, recordType, buyer, price) {
  const updated = await requestInventory({ method: 'PATCH', body: JSON.stringify({ id: product.id, qty: product.qty - qty }) });
  Object.assign(product, updated);
  const record = await requestRecords({ method: 'POST', body: JSON.stringify({ productId: product.id, name: product.name, qty, price, color: buyer.color || 'Standard', buyer: buyer.name || '', date: today(), recordType }) });
  state.records.unshift(record);
  return record;
}

function updateSaleChoices() {
  const product = state.products.find(item => item.id === $('sellToy').value) || state.products.find(item => item.qty > 0);
  if (!product) {
    $('sellColor').innerHTML = '<option value="">No colors yet</option>';
    $('sellToyName').value = '';
    return;
  }
  $('sellToy').value = product.id;
  $('sellToyName').value = product.name;
  fillColorSelect('sellColor', product);
  const variant = findVariant(product, $('sellColor').value);
  if ($('recordType').value === 'sale') $('sellPrice').value = String(variant.price.toFixed(2));
}

function selectSaleToy(id) {
  $('sellToy').value = id;
  updateSaleChoices();
}

async function fulfillOrder(id) {
  const order = state.orders.find(item => item.id === id);
  const product = state.products.find(item => item.id === order?.productId);
  if (!order || !product) return;
  if (order.qty > product.qty) return alert(`Only ${product.qty} ${product.name} left.`);
  try {
    const variant = findVariant(product, order.color);
    await createRecordAndReduce(product, order.qty, 'sale', { name: order.customer, color: order.color }, variant.price);
    const updatedOrder = await requestOrders({ method: 'PATCH', body: JSON.stringify({ id: order.id, status: 'completed' }) });
    Object.assign(order, updatedOrder);
    addActivity(`Fulfilled ${order.customer}'s order for ${product.name}.`);
    save();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function updateOrderStatus(id, status) {
  const order = state.orders.find(item => item.id === id);
  if (!order) return;
  try {
    const updatedOrder = await requestOrders({ method: 'PATCH', body: JSON.stringify({ id: order.id, status }) });
    Object.assign(order, updatedOrder);
    if (status === 'ready_for_pickup') addActivity(`${order.name} for ${order.customer} is ready for pickup.`);
    save();
    render();
  } catch (error) {
    alert(error.message);
  }
}

function unlockMoney() {
  if (!state.settings.adultPin) {
    const firstPin = prompt('Create a four-digit admin PIN.');
    if (!/^\d{4}$/.test(firstPin || '')) return alert('Please choose exactly four numbers.');
    const confirmPin = prompt('Enter the PIN one more time.');
    if (confirmPin !== firstPin) return alert('The PINs did not match.');
    state.settings.adultPin = firstPin;
    save();
  } else if (prompt('Enter the admin PIN.') !== state.settings.adultPin) {
    return alert('That PIN is not correct.');
  }
  $('privateReport').hidden = false;
  $('unlockMoney').hidden = true;
  renderPrivateSummary();
}

function requestAccess() {
  if (accessUnlocked) return true;
  if (!state.settings.adultPin) {
    const firstPin = prompt('Create one four-digit PIN for kids and parents to manage the shop.');
    if (!/^\d{4}$/.test(firstPin || '')) {
      alert('Please choose exactly four numbers.');
      return false;
    }
    const confirmPin = prompt('Enter the PIN one more time.');
    if (confirmPin !== firstPin) {
      alert('The PINs did not match.');
      return false;
    }
    state.settings.adultPin = firstPin;
    save();
  } else if (prompt('Enter the shop PIN.') !== state.settings.adultPin) {
    alert('That PIN is not correct.');
    return false;
  }
  accessUnlocked = true;
  return true;
}

function setupPhotoPicker() {
  const library = $('photo');
  library.closest('.card').querySelector('p').textContent = 'Photos are optional. Take one now, choose one from this iPad, or add one later.';
  library.removeAttribute('capture');
  const camera = document.createElement('input');
  camera.type = 'file';
  camera.accept = 'image/*';
  camera.capture = 'environment';
  camera.id = 'cameraPhoto';
  const cameraLabel = document.createElement('label');
  cameraLabel.textContent = 'Take a new photo';
  const libraryLabel = document.createElement('label');
  libraryLabel.textContent = 'Or choose a photo from this iPad';
  library.before(cameraLabel);
  cameraLabel.append(camera);
  library.before(libraryLabel);
  libraryLabel.append(library);
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Add without a photo for now';
  skip.onclick = () => {
    photoData = '';
    $('preview').hidden = true;
    show('addStatus', 'You can add the toy now and upload the photo later.', 'success');
  };
  libraryLabel.after(skip);
  const savePhotoButton = document.createElement('button');
  savePhotoButton.type = 'button';
  savePhotoButton.textContent = 'Save photo to library';
  savePhotoButton.onclick = () => {
    if (!photoData) {
      show('addStatus', 'Choose or take a photo first.', 'error');
      return;
    }
    const label = $('photoLabel')?.value.trim() || `Toy photo ${state.photoLibrary.length + 1}`;
    state.photoLibrary.unshift({ id: crypto.randomUUID(), label, data: photoData });
    state.photoLibrary = state.photoLibrary.slice(0, 30);
    save();
    renderPhotoLibrary();
    show('addStatus', `Saved photo: ${label}`, 'success');
  };
  skip.after(savePhotoButton);
  const preparePhoto = file => {
    if (!file) return;
    show('addStatus', 'Getting the photo ready...');
    compressedPhoto(file).then(image => {
      photoData = image;
      $('preview').src = image;
      $('preview').hidden = false;
      show('addStatus', 'Photo ready.', 'success');
    }).catch(() => show('addStatus', 'That photo did not work. Try another one.', 'error'));
  };
  camera.addEventListener('change', event => preparePhoto(event.target.files[0]));
  library.addEventListener('change', event => preparePhoto(event.target.files[0]));
}

function setupSimpleInventory() {
  const costGrid = $('grams').closest('.two');
  costGrid.previousElementSibling?.remove();
  costGrid.remove();
  $('profitTarget').closest('label').remove();
  $('suggestion').remove();
  $('askingPrice').parentElement.firstChild.nodeValue = 'Price for one toy ';
  $('make').querySelector('.card').insertAdjacentHTML('beforeend', `<label>Photo name (optional)<input id="photoLabel" placeholder="Blue dragon photo"></label>`);
  $('makeForm').insertAdjacentHTML('beforebegin', `<div class="card"><h2>Saved photo library</h2><p class="hint">Save photos first, then choose one when you add inventory.</p><div id="photoLibrary" class="customer-grid"></div></div>`);
  document.querySelector('[data-view="today"]').textContent = 'Inventory';
  document.querySelector('[data-view="count"]').textContent = 'Orders';
  document.querySelector('[data-view="make"]').textContent = 'Add toys';
  document.querySelector('[data-view="sell"]').textContent = 'Sales';
  document.querySelector('[data-view="shop"]').textContent = 'Shop';
  document.querySelector('[data-view="money"]').textContent = 'Admin';
  document.querySelector('[data-view="parent"]').remove();
  $('parent').remove();
  $('today').querySelector('.big-action').textContent = 'Open sales tools';
  $('today').querySelector('.big-action').dataset.go = 'sell';
  $('count').querySelector('h2').textContent = 'Customer orders';
  $('count').querySelector('.hint').textContent = 'Families can request any listed color here. Mark orders as pending print, ready for pickup, then completed when handed over.';
  $('saveCount').remove();
  $('countStatus').remove();
  $('money').innerHTML = `<div class="card parent"><h2>Admin report</h2><p class="hint">Use the same shop PIN to open inventory tools and this report.</p><div id="privateReport"><div class="grid" style="margin-top:14px"><div class="stat mint"><span>Toys sold</span><strong id="soldTotal">0</strong></div><div class="stat gold"><span>Given free</span><strong id="freeTotal">0</strong></div><div class="stat"><span>Broken</span><strong id="brokenTotal">0</strong></div><div class="stat mint"><span>Pending print</span><strong id="pendingOrders">0</strong></div><div class="stat gold"><span>Completed orders</span><strong id="fulfilledOrders">0</strong></div></div><p style="margin-bottom:0">Money from sales: <b id="salesMoney">$0.00</b></p><div class="card" style="margin-top:14px"><h3>Shop insights</h3><p><b>Most ordered:</b> <span id="mostOrdered">No orders yet.</span></p><p><b>Most expensive:</b> <span id="mostExpensive">No products yet.</span></p><p><b>Inventory age:</b> <span id="inventoryAge">No inventory yet.</span></p><p><b>Average sale price per month:</b> <span id="avgMonthlySalePrice">$0.00</span></p></div></div></div>`;
  const saleForm = $('saleForm');
  saleForm.querySelector('h2').textContent = 'Update inventory after a sale or event';
  saleForm.querySelector('p').textContent = 'Use this when kids sell at events, give a toy away, break one, or finish a customer order.';
  saleForm.querySelector('label').insertAdjacentHTML('afterend', `<label>What happened?<select id="recordType"><option value="sale">Sold</option><option value="free">Given free</option><option value="broken">Broken</option></select></label>`);
  $('recordType').addEventListener('change', updateSaleForm);
  updateSaleForm();
}

function updateSaleForm() {
  const isSale = $('recordType').value === 'sale';
  $('sellPrice').closest('label').hidden = !isSale;
  $('sellPrice').required = isSale;
  $('buyer').closest('label').firstChild.nodeValue = isSale ? 'Buyer name (optional) ' : 'Note (optional) ';
  updateSaleChoices();
}

$('makeForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('addInventory');
  button.disabled = true;
  try {
    const variants = normalizeVariants(+$('askingPrice').value);
    const created = await requestInventory({ method: 'POST', body: JSON.stringify({ name: $('name').value.trim(), qty: +$('quantity').value, price: variants[0].price, variants, photo: photoData }) });
    state.products.push(created);
    addActivity(`Added ${created.qty} ${created.name}.`);
    event.target.reset();
    $('preview').hidden = true;
    photoData = '';
    setNewToyDefaults();
    render();
    show('addStatus', `${created.name} is in inventory.`, 'success');
  } catch (error) {
    show('addStatus', error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

$('saleForm').addEventListener('submit', async event => {
  event.preventDefault();
  const product = state.products.find(item => item.id === $('sellToy').value);
  const qty = +$('sellQty').value;
  const recordType = $('recordType').value;
  const color = $('sellColor').value;
  const variant = findVariant(product, color);
  if (!product || qty > product.qty) return alert('Please choose a toy that is available.');
  try {
    await createRecordAndReduce(product, qty, recordType, { name: $('buyer').value.trim(), color }, recordType === 'sale' ? +$('sellPrice').value : 0);
    const message = { sale: `Sold ${qty} ${color} ${product.name}.`, free: `Marked ${qty} ${color} ${product.name} as free.`, broken: `Marked ${qty} ${color} ${product.name} as broken.` }[recordType];
    addActivity(message);
    event.target.reset();
    updateSaleForm();
    save();
    render();
    switchView('today');
  } catch (error) {
    alert(error.message);
  }
});

$('saveSettings').onclick = () => {
  state.settings.lowStockLimit = Math.max(0, +$('lowStockLimit').value || 0);
  save();
  render();
  show('parentStatus', 'Admin settings saved.', 'success');
};

$('downloadBackup').onclick = () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mini-maker-shop-backup-${today()}.json` });
  link.click();
  URL.revokeObjectURL(link.href);
  show('parentStatus', 'Backup downloaded.', 'success');
};

$('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const qty = +$('orderQty').value;
  if (!orderProduct || qty <= 0) return alert('Please choose a toy and quantity first.');
  try {
    const created = await requestOrders({ method: 'POST', body: JSON.stringify({ productId: orderProduct.id, name: orderProduct.name, qty, color: $('orderColor').value, customer: $('orderName').value.trim(), contact: $('orderContact').value.trim(), note: $('orderNote').value.trim() }) });
    state.orders.unshift(created);
    addActivity(`New order from ${created.customer} for ${created.qty} ${created.color} ${created.name}.`);
    $('orderDialog').close();
    event.target.reset();
    save();
    render();
  } catch (error) {
    alert(error.message);
  }
});

$('closeOrder').onclick = () => $('orderDialog').close();
$('orderColor').addEventListener('change', renderOrderColorPreview);
$('addColorOption').onclick = () => {
  const color = $('colorName').value.trim();
  const price = Number($('colorPrice').value);
  if (!color) return show('addStatus', 'Add a color name first.', 'error');
  if (!Number.isFinite(price) || price <= 0) return show('addStatus', 'Add a valid color price.', 'error');
  draftVariants.push({ color, photo: draftColorPhoto, price });
  $('colorName').value = '';
  draftColorPhoto = '';
  $('colorPhoto').value = '';
  $('colorPrice').value = String(price.toFixed(2));
  renderDraftVariants();
  show('addStatus', `${color} added to the color list.`, 'success');
};
$('loadSamples').onclick = () => {
  loadSampleCatalog();
  show('addStatus', 'Sample toys loaded for UI testing.', 'success');
};
$('makeForm').addEventListener('reset', () => setTimeout(setNewToyDefaults));
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => switchView(button.dataset.view));
document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => switchView(button.dataset.go));
$('sellToy').addEventListener('change', updateSaleChoices);
$('sellColor').addEventListener('change', updateSaleChoices);

setupPhotoPicker();
setupSimpleInventory();
setNewToyDefaults();
ensureSampleCatalogForTesting();
if (location.pathname.toLowerCase().endsWith('/dashboard.html') || location.pathname.toLowerCase().endsWith('\\dashboard.html')) {
  if (!requestAccess()) {
    document.body.innerHTML = '<main style="max-width:520px;margin:40px auto;padding:0 16px"><div style="background:#fff;border:1px solid #e4e3ee;border-radius:19px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><h1 style="margin-top:0">Dashboard locked</h1><p>Ask a parent or shop helper for the 4-digit PIN, then open the dashboard again.</p><p><a href="./index.html">Go to customer order page</a></p></div></main>';
    throw new Error('Dashboard locked');
  }
}
render();
loadSharedData();

if ($('colorPhoto')) {
  $('colorPhoto').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) {
      draftColorPhoto = '';
      return;
    }
    show('addStatus', 'Getting the filament photo ready...');
    compressedPhoto(file).then(image => {
      draftColorPhoto = image;
      show('addStatus', 'Filament photo ready. Now tap Add color.', 'success');
    }).catch(() => {
      draftColorPhoto = '';
      $('colorPhoto').value = '';
      show('addStatus', 'That filament photo did not work. Try another one.', 'error');
    });
  });
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
