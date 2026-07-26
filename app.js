const key = 'mini-maker-shop-v1';
const defaults = { products: [], sales: [], orders: [], agreement: { shopKeep: 20, one: 'Me', two: 'Partner', share: 50 } };

function readState() {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      ...defaults,
      ...stored,
      products: Array.isArray(stored.products) ? stored.products : [],
      sales: Array.isArray(stored.sales) ? stored.sales : [],
      orders: Array.isArray(stored.orders) ? stored.orders : [],
      agreement: { ...defaults.agreement, ...(stored.agreement || {}) },
    };
  } catch {
    return structuredClone(defaults);
  }
}

let state = readState();
let photoData = '';
let orderProduct = null;
const $ = id => document.getElementById(id);
const money = number => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number || 0);
const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function saveLocalState() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Inventory is still safely stored in Netlify Database if browser storage is full.
  }
}

async function requestInventory(options) {
  const response = await fetch('/api/inventory', options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Inventory could not be saved right now.');
  return body;
}

function showAddStatus(message, type = '') {
  $('addStatus').textContent = message;
  $('addStatus').className = `status ${type}`.trim();
}

async function loadInventory() {
  try {
    let inventory = await requestInventory();
    if (!inventory.length && state.products.length) {
      const migrated = [];
      for (const product of state.products) {
        try {
          migrated.push(await requestInventory({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
          }));
        } catch {
          break;
        }
      }
      if (migrated.length) inventory = migrated;
    }
    state.products = inventory;
    saveLocalState();
    render();
  } catch {
    showAddStatus('Showing saved inventory. Connect to the internet to sync changes.', 'error');
  }
}

function productCost(product) {
  return product.material + product.labor;
}

function total() {
  const sales = state.sales.reduce((sum, sale) => sum + sale.price * sale.qty, 0);
  const cost = state.sales.reduce((sum, sale) => sum + sale.unitCost * sale.qty, 0);
  return { sales, cost, profit: sales - cost };
}

function pricing() {
  const material = (+$('grams').value || 0) * (+$('perGram').value || 0);
  const labor = (+$('hours').value || 0) * (+$('labor').value || 0);
  const cost = material + labor;
  const target = +$('profitTarget').value || 0;
  const price = cost * (1 + target / 100);
  $('suggestion').innerHTML = `Material: <b>${money(material)}</b> + time & effort: <b>${money(labor)}</b><br>Capital cost per toy: <b>${money(cost)}</b><br><b>A fair suggested price: ${money(price)}</b> (cost + ${target}% profit)`;
  $('askingPrice').value = price.toFixed(2);
}

function compressedPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const maxSize = 900;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be read.'));
    };
    image.src = url;
  });
}

function render() {
  const products = state.products;
  const select = products.filter(product => product.qty > 0).map(product => `<option value="${product.id}">${esc(product.name)} — ${product.qty} ready (${money(product.price)})</option>`).join('') || '<option value="">No toys ready yet</option>';
  $('sellToy').innerHTML = select;
  $('inventory').innerHTML = products.length ? products.map(product => `<div class="product"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><div><h3>${esc(product.name)}</h3><p><span class="badge">${product.qty} ready</span></p><p>Capital cost: <b>${money(productCost(product))}</b> · Price: <b>${money(product.price)}</b></p><p class="small">Material ${money(product.material)} + time & effort ${money(product.labor)} = ${money(product.price - productCost(product))} profit per toy</p></div></div>`).join('') : '<p class="empty">Add your first toy above.</p>';
  $('customerShop').innerHTML = products.filter(product => product.qty > 0).map(product => `<button class="shop-card" data-order="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge">${money(product.price)}</span><br><span class="small">${product.qty} available · Tap to order</span></button>`).join('') || '<p class="empty">New toys will appear here.</p>';
  $('salesLog').innerHTML = state.sales.length ? state.sales.slice().reverse().map(sale => `<div class="order"><b>${esc(sale.name)} × ${sale.qty}</b> — ${money(sale.price * sale.qty)}<br><span class="small">${esc(sale.buyer || 'No note')} · profit ${money((sale.price - sale.unitCost) * sale.qty)}</span></div>`).join('') : '<p class="empty">No sales recorded yet.</p>';
  $('orders').innerHTML = state.orders.length ? state.orders.slice().reverse().map(order => `<div class="order"><b>${esc(order.name)} × ${order.qty}</b> from ${esc(order.customer)}<br><span class="small">${esc(order.note || 'No message')}</span></div>`).join('') : '<p class="empty">No order requests yet.</p>';
  const totals = total();
  const agreement = state.agreement;
  const kept = totals.profit * Math.max(0, agreement.shopKeep) / 100;
  const remaining = totals.profit - kept;
  const one = remaining * agreement.share / 100;
  const two = remaining - one;
  $('totalSales').textContent = money(totals.sales);
  $('totalCost').textContent = money(totals.cost);
  $('totalProfit').textContent = money(totals.profit);
  $('shopKeep').value = agreement.shopKeep;
  $('partnerOne').value = agreement.one;
  $('partnerTwo').value = agreement.two;
  $('partnerShare').value = agreement.share;
  $('split').innerHTML = `<p>The shop keeps <b>${money(kept)}</b> for future supplies.</p><div class="grid"><div class="stat gold"><span>${esc(agreement.one)}</span><strong>${money(one)}</strong></div><div class="stat gold"><span>${esc(agreement.two)}</span><strong>${money(two)}</strong></div><div class="stat"><span>Still shared</span><strong>${money(remaining)}</strong></div></div><p class="hint">This is based on recorded sales only. Be honest: include every sale and every cost.</p>`;
  document.querySelectorAll('[data-order]').forEach(button => button.onclick = () => openOrder(button.dataset.order));
}

function openOrder(id) {
  orderProduct = state.products.find(product => product.id === id);
  if (!orderProduct) return;
  $('orderTitle').textContent = `Order ${orderProduct.name}`;
  $('orderPhoto').src = orderProduct.photo;
  $('orderQty').max = orderProduct.qty;
  $('orderDialog').showModal();
}

['grams', 'perGram', 'hours', 'labor', 'profitTarget'].forEach(id => $(id).addEventListener('input', pricing));

$('photo').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  showAddStatus('Preparing photo…');
  try {
    photoData = await compressedPhoto(file);
    $('preview').src = photoData;
    $('preview').hidden = false;
    showAddStatus('Photo ready.', 'success');
  } catch (error) {
    photoData = '';
    showAddStatus(error.message, 'error');
  }
});

$('makeForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('addInventory');
  button.disabled = true;
  button.textContent = 'Adding toy…';
  showAddStatus('Saving inventory…');
  const material = +$('grams').value * +$('perGram').value;
  const labor = +$('hours').value * +$('labor').value;
  const product = { name: $('name').value.trim(), qty: +$('quantity').value, material, labor, price: +$('askingPrice').value, photo: photoData };
  try {
    const created = await requestInventory({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
    state.products.push(created);
    saveLocalState();
    event.target.reset();
    $('preview').hidden = true;
    photoData = '';
    pricing();
    render();
    showAddStatus(`${created.name} was added to inventory.`, 'success');
  } catch (error) {
    showAddStatus(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Add this toy to inventory';
  }
});

$('saleForm').addEventListener('submit', async event => {
  event.preventDefault();
  const product = state.products.find(item => item.id === $('sellToy').value);
  const qty = +$('sellQty').value;
  if (!product || qty > product.qty) return alert('Please choose a toy that is available.');
  try {
    const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: product.qty - qty }) });
    product.qty = updated.qty;
    state.sales.push({ name: product.name, qty, price: +$('sellPrice').value, unitCost: productCost(product), buyer: $('buyer').value });
    saveLocalState();
    event.target.reset();
    render();
  } catch (error) {
    alert(error.message);
  }
});

$('agreement').addEventListener('submit', event => {
  event.preventDefault();
  state.agreement = { shopKeep: +$('shopKeep').value, one: $('partnerOne').value, two: $('partnerTwo').value, share: +$('partnerShare').value };
  saveLocalState();
  render();
});

$('orderForm').addEventListener('submit', event => {
  event.preventDefault();
  const qty = +$('orderQty').value;
  if (qty > orderProduct.qty) return alert(`Only ${orderProduct.qty} available.`);
  state.orders.push({ name: orderProduct.name, qty, customer: $('orderName').value, note: $('orderNote').value });
  saveLocalState();
  $('orderDialog').close();
  event.target.reset();
  render();
});

$('closeOrder').onclick = () => $('orderDialog').close();
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === button.dataset.view));
});

pricing();
render();
loadInventory();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
