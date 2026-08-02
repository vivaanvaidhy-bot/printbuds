const api = window.MiniMakerApi;
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

let state = { products: [], orders: [] };
let orderProduct = null;

function colorOptions(product) {
  return product?.variants?.length ? product.variants : [{ color: 'Standard', price: Number(product?.price || 0), photo: '' }];
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
  document.querySelectorAll('[data-order]').forEach(button => {
    button.onclick = () => openOrder(button.dataset.order);
  });
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
  state.products = await api.inventory.list();
  state.orders = await api.orders.list();
  render();
}

$('orderColor').addEventListener('change', renderOrderColorPreview);
$('closeOrder').onclick = () => $('orderDialog').close();
$('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const qty = +$('orderQty').value;
  if (!orderProduct || qty <= 0) return alert('Please choose a toy and quantity first.');
  await api.orders.create({
    productId: orderProduct.id,
    name: orderProduct.name,
    qty,
    color: $('orderColor').value,
    customer: $('orderName').value.trim(),
    contact: $('orderContact').value.trim(),
    note: $('orderNote').value.trim()
  });
  $('orderDialog').close();
  event.target.reset();
  await loadData();
});

loadData();
