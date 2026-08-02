const supabaseUrl = (window.MINI_MAKER_SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseAnonKey = (window.MINI_MAKER_SUPABASE_ANON_KEY || '').trim();
const hasSharedInventory = Boolean(supabaseUrl && supabaseAnonKey);
const key = 'mini-maker-shop-v3';
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

let state = { products: [], orders: [] };
let orderProduct = null;

function readLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      products: Array.isArray(saved.products) ? saved.products : [],
      orders: Array.isArray(saved.orders) ? saved.orders : []
    };
  } catch {
    return { products: [], orders: [] };
  }
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
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  if (response.status === 204) return null;
  return response.json();
}

function colorOptions(product) {
  return (product?.variants?.length ? product.variants : [{ color: 'Standard', price: Number(product?.price || 0), photo: '' }]);
}

function findVariant(product, color) {
  return colorOptions(product).find(variant => variant.color === color) || colorOptions(product)[0];
}

function fillColorSelect(product, selectedColor = '') {
  const variants = colorOptions(product);
  $('orderColor').innerHTML = variants.map(variant => `<option value="${esc(variant.color)}">${esc(variant.color)} - ${money(variant.price)}</option>`).join('');
  $('orderColor').value = selectedColor && variants.some(variant => variant.color === selectedColor) ? selectedColor : variants[0].color;
}

function renderOrderColorPreview() {
  if (!orderProduct) return;
  const variant = findVariant(orderProduct, $('orderColor').value);
  const thumbnail = variant?.photo ? `<img src="${variant.photo}" alt="${esc(variant.color)}" style="width:32px;height:32px;border-radius:999px;object-fit:cover;vertical-align:middle;margin-right:8px">` : '';
  $('orderColorPreview').innerHTML = `${thumbnail}<span class="badge" style="display:inline-flex;align-items:center">${esc(variant.color)} · ${money(variant.price)} each</span>`;
}

function render() {
  $('customerShop').innerHTML = state.products.length
    ? state.products.map(product => `<button class="shop-card" data-order="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge">From ${money(Math.min(...colorOptions(product).map(variant => variant.price)))}</span><br><span class="small">${product.qty} ready now · any listed color can be ordered</span><div style="margin-top:8px">${colorOptions(product).map(variant => `<span class="badge" style="display:inline-flex;align-items:center">${variant.photo ? `<img src="${variant.photo}" alt="${esc(variant.color)}" style="width:18px;height:18px;border-radius:999px;object-fit:cover;vertical-align:middle;margin-right:6px">` : ''}${esc(variant.color)} ${money(variant.price)}</span>`).join(' ')}</div></button>`).join('')
    : '<p class="empty">No toys are ready to order yet.</p>';
  $('orders').innerHTML = state.orders.length
    ? state.orders.map(order => `<div class="activity"><b>${esc(order.color)} ${esc(order.name)} x ${order.qty}</b> for ${esc(order.customer)}<br><span class="small">${esc(order.contact)}${order.note ? ` · ${esc(order.note)}` : ''}</span></div>`).join('')
    : '<p class="empty">No order requests yet.</p>';
  document.querySelectorAll('[data-order]').forEach(button => button.onclick = () => openOrder(button.dataset.order));
}

function openOrder(id) {
  orderProduct = state.products.find(product => product.id === id);
  if (!orderProduct) return;
  $('orderTitle').textContent = `Order ${orderProduct.name}`;
  $('orderPhoto').src = orderProduct.photo || '';
  $('orderQty').value = '1';
  $('orderInventoryHint').textContent = `${orderProduct.qty} ready now. Customers can still request any listed color, and you can print more if needed.`;
  fillColorSelect(orderProduct);
  renderOrderColorPreview();
  $('orderDialog').showModal();
}

async function loadData() {
  if (hasSharedInventory) {
    const [products, orders] = await Promise.all([
      supabaseRequest('inventory_items?select=id,name,qty,price,photo,variants,created_at&order=created_at.asc'),
      supabaseRequest('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at&order=created_at.desc')
    ]);
    state.products = products.map(row => ({ id: row.id, name: row.name, qty: Number(row.qty), price: Number(row.price), photo: row.photo || '', variants: Array.isArray(row.variants) ? row.variants : [] }));
    state.orders = orders.map(row => ({ id: row.id, productId: row.product_id, name: row.product_name, qty: Number(row.qty), color: row.color || 'Standard', customer: row.customer_name, contact: row.contact, note: row.note || '', status: row.status, createdAt: row.created_at }));
  } else {
    state = readLocalState();
  }
  render();
}

$('orderColor').addEventListener('change', renderOrderColorPreview);
$('closeOrder').onclick = () => $('orderDialog').close();
$('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const qty = +$('orderQty').value;
  if (!orderProduct || qty <= 0) return alert('Please choose a toy and quantity first.');
  const payload = {
    productId: orderProduct.id,
    name: orderProduct.name,
    qty,
    color: $('orderColor').value,
    customer: $('orderName').value.trim(),
    contact: $('orderContact').value.trim(),
    note: $('orderNote').value.trim()
  };
  if (hasSharedInventory) {
    await supabaseRequest('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at', {
      method: 'POST',
      body: {
        id: crypto.randomUUID(),
        product_id: payload.productId,
        product_name: payload.name,
        qty: payload.qty,
        color: payload.color,
        customer_name: payload.customer,
        contact: payload.contact,
        note: payload.note,
        status: 'pending_print'
      },
      prefer: 'return=representation'
    });
  } else {
    const local = readLocalState();
    local.orders.unshift({ ...payload, id: crypto.randomUUID(), status: 'pending_print', createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify({ ...local }));
  }
  $('orderDialog').close();
  event.target.reset();
  await loadData();
});

loadData();
