const key = 'mini-maker-shop-v2';
const defaults = { products: [], sales: [], orders: [], activities: [], countDraft: {}, settings: { lowStockLimit: 2, lastCountDate: '', countStreak: 0 }, agreement: { shopKeep: 20, one: 'Me', two: 'Partner', share: 50 } };

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem('mini-maker-shop-v1') || '{}');
    return { ...defaults, ...saved, products: Array.isArray(saved.products) ? saved.products : [], sales: Array.isArray(saved.sales) ? saved.sales : [], orders: Array.isArray(saved.orders) ? saved.orders : [], activities: Array.isArray(saved.activities) ? saved.activities : [], countDraft: saved.countDraft || {}, settings: { ...defaults.settings, ...(saved.settings || {}) }, agreement: { ...defaults.agreement, ...(saved.agreement || {}) } };
  } catch { return structuredClone(defaults); }
}

let state = readState();
let photoData = '';
let orderProduct = null;
const $ = id => document.getElementById(id);
const money = number => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number || 0);
const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const today = () => new Date().toISOString().slice(0, 10);
const save = () => localStorage.setItem(key, JSON.stringify(state));

async function requestInventory(options) {
  const response = await fetch('/api/inventory', options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The inventory could not be saved. Ask a grown-up for help.');
  return body;
}

function show(id, message, type = '') { $(id).textContent = message; $(id).className = `status ${type}`.trim(); }
function switchView(id) { document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === id)); document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === id)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function productCost(product) { return product.material + product.labor; }
function total() { const sales = state.sales.reduce((sum, sale) => sum + sale.price * sale.qty, 0); const cost = state.sales.reduce((sum, sale) => sum + sale.unitCost * sale.qty, 0); return { sales, cost, profit: sales - cost }; }
function addActivity(activity) { state.activities.unshift({ id: crypto.randomUUID(), at: new Date().toLocaleString(), ...activity }); state.activities = state.activities.slice(0, 30); save(); }

function pricing() {
  const material = (+$('grams').value || 0) * (+$('perGram').value || 0);
  const labor = (+$('hours').value || 0) * (+$('labor').value || 0);
  const cost = material + labor;
  const target = +$('profitTarget').value || 0;
  const price = cost * (1 + target / 100);
  $('suggestion').innerHTML = `Plastic: <b>${money(material)}</b> + helper time: <b>${money(labor)}</b><br>It costs <b>${money(cost)}</b> to make one toy.<br><b>A fair price is ${money(price)}</b>.`;
}

function setDefaultPrice() {
  if (!$('askingPrice').value) $('askingPrice').value = '5.00';
}

function setNewToyDefaults() {
  $('grams').value = '18';
  $('perGram').value = '0.03';
  $('hours').value = '2';
  $('labor').value = '1.00';
  setDefaultPrice();
  pricing();
}

function renderToday() {
  const countedToday = state.settings.lastCountDate === today();
  const hasStock = state.products.length > 0;
  $('welcome').textContent = countedToday ? 'Great counting today! 🎉' : 'Ready, maker?';
  $('goalMessage').textContent = countedToday ? 'Your shelf and your app match. That is what a real shop helper does!' : 'Start with one important job: count the toys on your shelf.';
  $('checklist').innerHTML = [
    [countedToday, 'Count the toys on the shelf'],
    [hasStock, 'Check if any toys need making'],
    [state.sales.some(sale => sale.date === today()), 'Write down every sale'],
  ].map(([done, text]) => `<li class="${done ? 'done' : ''}"><span class="check">${done ? '✓' : '○'}</span>${text}</li>`).join('');
  const badges = [
    ['First count', state.settings.lastCountDate ? '✅' : '🔒'],
    [`${state.settings.countStreak || 0} count streak`, state.settings.countStreak ? '🔥' : '🌱'],
    ['Honest shop helper', state.activities.length >= 3 ? '🏅' : '⭐'],
  ];
  $('badges').innerHTML = badges.map(([label, icon]) => `<div class="stat gold"><strong>${icon}</strong><span>${esc(label)}</span></div>`).join('');
  const low = state.products.filter(product => product.qty <= state.settings.lowStockLimit);
  $('lowStock').innerHTML = low.length ? low.map(product => `<p><span class="badge low">Only ${product.qty} left</span> <b>${esc(product.name)}</b> ${product.qty ? '— make more soon!' : '— all gone!'}</p>`).join('') : '<p class="hint">Nothing is running low. Nice planning!</p>';
}

function renderCount() {
  if (!state.products.length) { $('countList').innerHTML = '<p class="empty">Add your first toy before you count it.</p>'; $('saveCount').disabled = true; return; }
  $('saveCount').disabled = false;
  $('countList').innerHTML = state.products.map(product => {
    const count = Number.isInteger(state.countDraft[product.id]) ? state.countDraft[product.id] : product.qty;
    return `<div class="count-card"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><div><h3>${esc(product.name)}</h3><p class="small">The app says: ${product.qty}. What can you count?</p><div class="stepper"><button data-count="${product.id}" data-change="-1" aria-label="One less ${esc(product.name)}">−</button><strong>${count}</strong><button class="primary" data-count="${product.id}" data-change="1" aria-label="One more ${esc(product.name)}">+</button></div></div></div>`;
  }).join('');
  document.querySelectorAll('[data-count]').forEach(button => button.onclick = () => { const id = button.dataset.count; const product = state.products.find(item => item.id === id); const current = Number.isInteger(state.countDraft[id]) ? state.countDraft[id] : product.qty; state.countDraft[id] = Math.max(0, current + Number(button.dataset.change)); save(); renderCount(); });
}

function renderInventory() {
  const products = state.products;
  $('sellToy').innerHTML = products.filter(product => product.qty > 0).map(product => `<option value="${product.id}">${esc(product.name)} — ${product.qty} ready (${money(product.price)})</option>`).join('') || '<option value="">No toys ready yet</option>';
  $('inventory').innerHTML = products.length ? products.map(product => `<div class="product"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><div><h3>${esc(product.name)}</h3><p><span class="badge ${product.qty <= state.settings.lowStockLimit ? 'low' : ''}">${product.qty} ready</span></p><p>Making one costs <b>${money(productCost(product))}</b> · Price: <b>${money(product.price)}</b></p></div></div>`).join('') : '<p class="empty">Add your first toy above.</p>';
  $('customerShop').innerHTML = products.filter(product => product.qty > 0).map(product => `<button class="shop-card" data-order="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge">${money(product.price)}</span><br><span class="small">${product.qty} available · Tap to order</span></button>`).join('') || '<p class="empty">New toys will appear here.</p>';
  document.querySelectorAll('[data-order]').forEach(button => button.onclick = () => openOrder(button.dataset.order));
}

function renderActivity() {
  $('activityLog').innerHTML = state.activities.length ? state.activities.map(activity => `<div class="activity"><b>${esc(activity.message)}</b><br><span class="small">${esc(activity.at)}</span>${activity.undoable ? `<button data-undo="${activity.id}">Undo</button>` : ''}</div>`).join('') : '<p class="empty">Your helpful actions will appear here.</p>';
  document.querySelectorAll('[data-undo]').forEach(button => button.onclick = () => undoActivity(button.dataset.undo));
  $('orders').innerHTML = state.orders.length ? state.orders.slice().reverse().map(order => `<div class="activity"><b>${esc(order.name)} × ${order.qty}</b> from ${esc(order.customer)}<br><span class="small">${esc(order.note || 'No message')}</span></div>`).join('') : '<p class="empty">No order requests yet.</p>';
}

function renderMoney() {
  const totals = total(); const agreement = state.agreement; const kept = totals.profit * Math.max(0, agreement.shopKeep) / 100; const remaining = totals.profit - kept; const one = remaining * agreement.share / 100;
  $('totalSales').textContent = money(totals.sales); $('totalCost').textContent = money(totals.cost); $('totalProfit').textContent = money(totals.profit);
  $('split').innerHTML = `<p>The shop saves <b>${money(kept)}</b> for future supplies.</p><div class="grid"><div class="stat gold"><span>${esc(agreement.one)}</span><strong>${money(one)}</strong></div><div class="stat gold"><span>${esc(agreement.two)}</span><strong>${money(remaining - one)}</strong></div><div class="stat"><span>Still shared</span><strong>${money(remaining)}</strong></div></div><p class="hint">This picture is based on every sale you wrote down. Honest records make a strong shop.</p>`;
  $('shopKeep').value = agreement.shopKeep; $('partnerOne').value = agreement.one; $('partnerTwo').value = agreement.two; $('partnerShare').value = agreement.share; $('lowStockLimit').value = state.settings.lowStockLimit;
}

function render() { renderToday(); renderCount(); renderInventory(); renderActivity(); renderMoney(); }

async function loadInventory() {
  try { state.products = await requestInventory(); save(); render(); }
  catch { show('countStatus', 'Start the app server so your inventory can be saved.', 'error'); }
}

function openOrder(id) { orderProduct = state.products.find(product => product.id === id); if (!orderProduct) return; $('orderTitle').textContent = `Order ${orderProduct.name}`; $('orderPhoto').src = orderProduct.photo; $('orderQty').max = orderProduct.qty; $('orderDialog').showModal(); }

async function undoActivity(id) {
  const activity = state.activities.find(item => item.id === id); if (!activity || !activity.undoable) return;
  const product = state.products.find(item => item.id === activity.productId); if (!product) return;
  try { const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: activity.previousQty }) }); product.qty = updated.qty; state.activities = state.activities.filter(item => item.id !== id); if (activity.saleIndex !== undefined) state.sales.splice(activity.saleIndex, 1); save(); render(); }
  catch (error) { alert(error.message); }
}

['grams', 'perGram', 'hours', 'labor', 'profitTarget'].forEach(id => $(id).addEventListener('input', pricing));
$('photo').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; show('addStatus', 'Getting your photo ready…'); try { photoData = await compressedPhoto(file); $('preview').src = photoData; $('preview').hidden = false; show('addStatus', 'Photo ready!', 'success'); } catch { show('addStatus', 'That photo did not work. Try another one.', 'error'); } });

function compressedPhoto(file) { return new Promise((resolve, reject) => { const image = new Image(); const url = URL.createObjectURL(file); image.onload = () => { const size = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * size)); canvas.height = Math.max(1, Math.round(image.naturalHeight * size)); const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', .75)); }; image.onerror = () => { URL.revokeObjectURL(url); reject(); }; image.src = url; }); }

$('makeForm').addEventListener('submit', async event => { event.preventDefault(); const button = $('addInventory'); button.disabled = true; const product = { name: $('name').value.trim(), qty: +$('quantity').value, material: +$('grams').value * +$('perGram').value, labor: +$('hours').value * +$('labor').value, price: +$('askingPrice').value, photo: photoData }; try { const created = await requestInventory({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) }); state.products.push(created); addActivity({ message: `Added ${created.qty} ${created.name}!`, productId: created.id, previousQty: 0, undoable: false }); event.target.reset(); $('preview').hidden = true; photoData = ''; pricing(); render(); show('addStatus', `Awesome! ${created.name} is in your shop.`, 'success'); switchView('today'); } catch (error) { show('addStatus', error.message, 'error'); } finally { button.disabled = false; } });

$('saveCount').onclick = async () => { const changes = state.products.filter(product => (state.countDraft[product.id] ?? product.qty) !== product.qty); const button = $('saveCount'); button.disabled = true; try { for (const product of changes) { const previousQty = product.qty; const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: state.countDraft[product.id] }) }); product.qty = updated.qty; addActivity({ message: `Counted ${updated.qty} ${updated.name}`, productId: updated.id, previousQty, undoable: true }); } const last = state.settings.lastCountDate; state.settings.countStreak = last === today() ? state.settings.countStreak : state.settings.countStreak + 1; state.settings.lastCountDate = today(); state.countDraft = {}; save(); render(); show('countStatus', '🎉 Great job! Your shelf and your app match!', 'success'); } catch (error) { show('countStatus', error.message, 'error'); } finally { button.disabled = false; } };

$('saleForm').addEventListener('submit', async event => { event.preventDefault(); const product = state.products.find(item => item.id === $('sellToy').value); const qty = +$('sellQty').value; if (!product || qty > product.qty) return alert('Please choose a toy that is available.'); const previousQty = product.qty; try { const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: product.qty - qty }) }); product.qty = updated.qty; const sale = { name: product.name, qty, price: +$('sellPrice').value, unitCost: productCost(product), buyer: $('buyer').value, date: today() }; state.sales.push(sale); addActivity({ message: `Sold ${qty} ${product.name}! Great work!`, productId: product.id, previousQty, saleIndex: state.sales.length - 1, undoable: true }); event.target.reset(); save(); render(); switchView('today'); } catch (error) { alert(error.message); } });

$('agreement').addEventListener('submit', event => { event.preventDefault(); state.agreement = { shopKeep: +$('shopKeep').value, one: $('partnerOne').value, two: $('partnerTwo').value, share: +$('partnerShare').value }; save(); render(); });
$('saveSettings').onclick = () => { state.settings.lowStockLimit = Math.max(0, +$('lowStockLimit').value || 0); save(); render(); show('parentStatus', 'Grown-up settings saved.', 'success'); };
$('downloadBackup').onclick = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mini-maker-shop-backup-${today()}.json` }); link.click(); URL.revokeObjectURL(link.href); show('parentStatus', 'Backup downloaded. Keep it somewhere safe!', 'success'); };
$('orderForm').addEventListener('submit', event => { event.preventDefault(); const qty = +$('orderQty').value; if (qty > orderProduct.qty) return alert(`Only ${orderProduct.qty} available.`); state.orders.push({ name: orderProduct.name, qty, customer: $('orderName').value, note: $('orderNote').value }); save(); $('orderDialog').close(); event.target.reset(); render(); });
$('closeOrder').onclick = () => $('orderDialog').close();
$('makeForm').addEventListener('reset', () => setTimeout(setNewToyDefaults));
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => switchView(button.dataset.view));
document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => switchView(button.dataset.go));

setNewToyDefaults(); render(); loadInventory();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
