const api = window.MiniMakerApi;
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

let state = { products: [], orders: [] };
let orderProduct = null;
let isSubmitting = false;

function setStatus(id, message, tone = '') {
  const element = $(id);
  if (!element) return;
  element.textContent = message;
  element.className = `status ${tone}`.trim();
}

function colorOptions(product) {
  return product?.variants?.length ? product.variants : [{ color: 'Standard', price: Number(product?.price || 0), photo: '' }];
}

function findVariant(product, color) {
  return colorOptions(product).find(variant => variant.color === color) || colorOptions(product)[0];
}

function priceRange(product) {
  const prices = colorOptions(product).map(variant => Number(variant.price || 0));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} - ${money(max)}`;
}

function fillColorSelect(product, selectedColor = '') {
  const variants = colorOptions(product);
  $('orderColor').innerHTML = variants.map(variant => `<option value="${esc(variant.color)}">${esc(variant.color)}</option>`).join('');
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
    ? state.products.map(product => `<button type="button" class="shop-card" data-order="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge">${priceRange(product)}</span><br><span class="small">${product.qty} ready now · choose a color to see the exact price</span></button>`).join('')
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
  $('orderInventoryHint').textContent = `${orderProduct.qty} ready now. Price range: ${priceRange(orderProduct)}.`;
  fillColorSelect(orderProduct);
  renderOrderColorPreview();
  setStatus('orderFormStatus', '');
  $('orderDialog').showModal();
}

async function loadData() {
  try {
    state.products = await api.inventory.list();
    state.orders = await api.orders.list();
    render();
    setStatus('customerStatus', '');
  } catch (error) {
    console.error(error);
    setStatus('customerStatus', error.message || 'Could not load BuildBuddy3D right now.', 'error');
  }
}

$('orderColor').addEventListener('change', renderOrderColorPreview);
$('closeOrder').onclick = () => {
  if (isSubmitting) return;
  $('orderDialog').close();
};

$('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (isSubmitting) return;

  const qty = +$('orderQty').value;
  if (!orderProduct || qty <= 0) return alert('Please choose a toy and quantity first.');

  const customer = $('orderName').value.trim();
  const contact = $('orderContact').value.trim();
  if (!customer || !contact) {
    setStatus('orderFormStatus', 'Please enter your name and email or phone.', 'warn');
    return;
  }

  isSubmitting = true;
  setStatus('orderFormStatus', 'Sending order request...', 'warn');

  try {
    await api.orders.create({
      productId: orderProduct.id,
      name: orderProduct.name,
      qty,
      color: $('orderColor').value,
      customer,
      contact,
      note: $('orderNote').value.trim()
    });
    $('orderDialog').close();
    event.target.reset();
    setStatus('customerStatus', 'Order request sent!', 'ok');
    await loadData();
  } catch (error) {
    console.error(error);
    setStatus('orderFormStatus', error.message || 'Could not send the order request. Please try again.', 'error');
  } finally {
    isSubmitting = false;
  }
});

loadData();
