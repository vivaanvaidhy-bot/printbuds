const key = 'mini-maker-shop-v2';
const defaults = { products: [], sales: [], orders: [], supplies: [], activities: [], countDraft: {}, settings: { lowStockLimit: 2, lastCountDate: '', countStreak: 0, adultPin: '' }, agreement: { shopKeep: 20, one: 'Me', two: 'Partner', share: 50 } };

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem('mini-maker-shop-v1') || '{}');
    return { ...defaults, ...saved, products: Array.isArray(saved.products) ? saved.products : [], sales: Array.isArray(saved.sales) ? saved.sales : [], orders: Array.isArray(saved.orders) ? saved.orders : [], supplies: Array.isArray(saved.supplies) ? saved.supplies : [], activities: Array.isArray(saved.activities) ? saved.activities : [], countDraft: saved.countDraft || {}, settings: { ...defaults.settings, ...(saved.settings || {}) }, agreement: { ...defaults.agreement, ...(saved.agreement || {}) } };
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

async function requestInventory(options = {}) {
  const method = options.method || 'GET';
  if (method === 'GET') return structuredClone(state.products);
  const input = JSON.parse(options.body || '{}');
  if (method === 'POST') return { ...input, id: crypto.randomUUID() };
  const product = state.products.find(item => item.id === input.id);
  if (!product) throw new Error('Toy not found.');
  if (typeof input.photo === 'string') return { ...product, photo: input.photo };
  if (!Number.isInteger(input.qty) || input.qty < 0) throw new Error('Please enter a valid toy count.');
  return { ...product, qty: input.qty };
}

function show(id, message, type = '') { $(id).textContent = message; $(id).className = `status ${type}`.trim(); }
function switchView(id) { document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === id)); document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === id)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function productCost(product) { return product.material + product.labor; }
function total() { const sales = state.sales.reduce((sum, sale) => sum + sale.price * sale.qty, 0); const cost = state.supplies.reduce((sum, supply) => sum + supply.cost, 0); return { sales, cost, profit: sales - cost }; }
function addActivity(activity) { state.activities.unshift({ id: crypto.randomUUID(), at: new Date().toLocaleString(), ...activity }); state.activities = state.activities.slice(0, 30); save(); }

function pricing() { setDefaultPrice(); }

function setDefaultPrice() {
  if (!$('askingPrice').value) $('askingPrice').value = '5.00';
}

function setNewToyDefaults() { setDefaultPrice(); }

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
  $('inventory').innerHTML = products.length ? products.map(product => `<div class="product"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><div><h3>${esc(product.name)}</h3><p><span class="badge ${product.qty <= state.settings.lowStockLimit ? 'low' : ''}">${product.qty} ready</span></p><p>Making one costs <b>${money(productCost(product))}</b> · Price: <b>${money(product.price)}</b></p>${product.photo ? '' : `<label class="small">Add a photo later<input data-photo-for="${product.id}" type="file" accept="image/*"></label>`}</div></div>`).join('') : '<p class="empty">Add your first toy above.</p>';
  document.querySelectorAll('#inventory .product').forEach((card, index) => { card.querySelectorAll('p')[1].innerHTML = `Selling price: <b>${money(products[index].price)}</b>`; });
  $('customerShop').innerHTML = products.filter(product => product.qty > 0).map(product => `<button class="shop-card" data-order="${product.id}"><img class="photo" src="${product.photo || ''}" alt="${esc(product.name)}"><strong>${esc(product.name)}</strong><br><span class="badge">${money(product.price)}</span><br><span class="small">${product.qty} available · Tap to order</span></button>`).join('') || '<p class="empty">New toys will appear here.</p>';
  document.querySelectorAll('[data-order]').forEach(button => button.onclick = () => openOrder(button.dataset.order));
  document.querySelectorAll('[data-photo-for]').forEach(input => input.onchange = event => uploadInventoryPhoto(input.dataset.photoFor, event.target.files[0]));
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
  document.querySelector('#money .grid .stat:nth-child(2) span').textContent = 'Supply purchases';
}

function render() { renderToday(); renderCount(); renderInventory(); renderActivity(); renderPrivateSummary(); }

async function loadInventory() { state.products = await requestInventory(); save(); render(); }

function openOrder(id) { orderProduct = state.products.find(product => product.id === id); if (!orderProduct) return; $('orderTitle').textContent = `Order ${orderProduct.name}`; $('orderPhoto').src = orderProduct.photo; $('orderQty').max = orderProduct.qty; $('orderDialog').showModal(); }

async function uploadInventoryPhoto(id, file) {
  const product = state.products.find(item => item.id === id);
  if (!product || !file) return;
  try {
    const photo = await compressedPhoto(file);
    const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, photo }) });
    product.photo = updated.photo;
    addActivity({ message: `Added a photo for ${product.name}!`, productId: id, undoable: false });
    render();
  } catch (error) {
    alert(error.message || 'That photo could not be added. Please try again.');
  }
}

async function undoActivity(id) {
  const activity = state.activities.find(item => item.id === id); if (!activity || !activity.undoable) return;
  const product = state.products.find(item => item.id === activity.productId); if (!product) return;
  try { const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: activity.previousQty }) }); product.qty = updated.qty; state.activities = state.activities.filter(item => item.id !== id); if (activity.saleIndex !== undefined) state.sales.splice(activity.saleIndex, 1); save(); render(); }
  catch (error) { alert(error.message); }
}

['grams', 'perGram', 'hours', 'labor', 'profitTarget'].forEach(id => $(id).addEventListener('input', pricing));
$('photo').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; show('addStatus', 'Getting your photo ready…'); try { photoData = await compressedPhoto(file); $('preview').src = photoData; $('preview').hidden = false; show('addStatus', 'Photo ready!', 'success'); } catch { show('addStatus', 'That photo did not work. Try another one.', 'error'); } });

function compressedPhoto(file) { return new Promise((resolve, reject) => { const image = new Image(); const url = URL.createObjectURL(file); image.onload = () => { const size = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * size)); canvas.height = Math.max(1, Math.round(image.naturalHeight * size)); const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', .75)); }; image.onerror = () => { URL.revokeObjectURL(url); reject(); }; image.src = url; }); }

$('makeForm').addEventListener('submit', async event => { event.preventDefault(); const button = $('addInventory'); button.disabled = true; const product = { name: $('name').value.trim(), qty: +$('quantity').value, material: 0, labor: 0, price: +$('askingPrice').value, photo: photoData }; try { const created = await requestInventory({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) }); state.products.push(created); addActivity({ message: `Added ${created.qty} ${created.name}!`, productId: created.id, previousQty: 0, undoable: false }); event.target.reset(); $('preview').hidden = true; photoData = ''; pricing(); render(); show('addStatus', `Awesome! ${created.name} is in your shop. Add another one when you are ready.`, 'success'); } catch (error) { show('addStatus', error.message, 'error'); } finally { button.disabled = false; } });

$('saveCount').onclick = async () => { const changes = state.products.filter(product => (state.countDraft[product.id] ?? product.qty) !== product.qty); const button = $('saveCount'); button.disabled = true; try { for (const product of changes) { const previousQty = product.qty; const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: state.countDraft[product.id] }) }); product.qty = updated.qty; addActivity({ message: `Counted ${updated.qty} ${updated.name}`, productId: updated.id, previousQty, undoable: true }); } const last = state.settings.lastCountDate; state.settings.countStreak = last === today() ? state.settings.countStreak : state.settings.countStreak + 1; state.settings.lastCountDate = today(); state.countDraft = {}; save(); render(); show('countStatus', '🎉 Great job! Your shelf and your app match!', 'success'); } catch (error) { show('countStatus', error.message, 'error'); } finally { button.disabled = false; } };

$('saleForm').addEventListener('submit', async event => { event.preventDefault(); const product = state.products.find(item => item.id === $('sellToy').value); const qty = +$('sellQty').value; const recordType = $('recordType').value; if (!product || qty > product.qty) return alert('Please choose a toy that is available.'); const previousQty = product.qty; try { const updated = await requestInventory({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, qty: product.qty - qty }) }); product.qty = updated.qty; let saleIndex; if (recordType === 'sale') { const sale = { name: product.name, qty, price: +$('sellPrice').value, unitCost: 0, buyer: $('buyer').value, date: today() }; state.sales.push(sale); saleIndex = state.sales.length - 1; } const messages = { sale: `Sold ${qty} ${product.name}! Great work!`, free: `Gave ${qty} ${product.name} away for free.`, broken: `Marked ${qty} ${product.name} as broken.` }; addActivity({ message: messages[recordType], productId: product.id, previousQty, saleIndex, recordType, qty, undoable: true }); event.target.reset(); updateSaleForm(); save(); render(); switchView('today'); } catch (error) { alert(error.message); } });

$('agreement').addEventListener('submit', event => { event.preventDefault(); state.agreement = { shopKeep: +$('shopKeep').value, one: $('partnerOne').value, two: $('partnerTwo').value, share: +$('partnerShare').value }; save(); render(); });
$('saveSettings').onclick = () => { state.settings.lowStockLimit = Math.max(0, +$('lowStockLimit').value || 0); save(); render(); show('parentStatus', 'Grown-up settings saved.', 'success'); };
$('downloadBackup').onclick = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `mini-maker-shop-backup-${today()}.json` }); link.click(); URL.revokeObjectURL(link.href); show('parentStatus', 'Backup downloaded. Keep it somewhere safe!', 'success'); };
$('orderForm').addEventListener('submit', event => { event.preventDefault(); const qty = +$('orderQty').value; if (qty > orderProduct.qty) return alert(`Only ${orderProduct.qty} available.`); state.orders.push({ name: orderProduct.name, qty, customer: $('orderName').value, note: $('orderNote').value }); save(); $('orderDialog').close(); event.target.reset(); render(); });
$('closeOrder').onclick = () => $('orderDialog').close();
$('makeForm').addEventListener('reset', () => setTimeout(setNewToyDefaults));
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => switchView(button.dataset.view));
document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => switchView(button.dataset.go));

function preparePhoto(file) {
  if (!file) return;
  show('addStatus', 'Getting your photo ready…');
  compressedPhoto(file).then(image => {
    photoData = image;
    $('preview').src = image;
    $('preview').hidden = false;
    show('addStatus', 'Photo ready!', 'success');
  }).catch(() => show('addStatus', 'That photo did not work. Try another one.', 'error'));
}

function setupPhotoPicker() {
  const library = $('photo');
  library.closest('.card').querySelector('p').textContent = 'Photos are optional. Take one now, choose one from this iPad, or add one later from inventory.';
  library.removeAttribute('capture');
  library.setAttribute('aria-label', 'Choose a photo already on this iPad');
  const camera = document.createElement('input');
  camera.type = 'file';
  camera.accept = 'image/*';
  camera.capture = 'environment';
  camera.id = 'cameraPhoto';
  camera.setAttribute('aria-label', 'Take a new photo with the camera');
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
  skip.onclick = () => { photoData = ''; $('preview').hidden = true; show('addStatus', 'No problem! Add the toy below, then another helper can upload its photo later.', 'success'); document.getElementById('makeForm').scrollIntoView({ behavior: 'smooth' }); };
  libraryLabel.after(skip);
  camera.addEventListener('change', event => preparePhoto(event.target.files[0]));
}

function activityKind(activity) {
  if (activity.recordType) return activity.recordType;
  if (activity.message.startsWith('Sold ')) return 'sale';
  if (activity.message.startsWith('Gave ')) return 'free';
  if (activity.message.startsWith('Marked ')) return 'broken';
  return '';
}

function activityQuantity(activity) {
  if (Number.isInteger(activity.qty)) return activity.qty;
  const match = activity.message.match(/^(?:Sold|Gave|Marked) (\d+)/);
  return match ? Number(match[1]) : 0;
}

function renderPrivateSummary() {
  if (!$('privateReport')) return;
  const count = kind => state.activities.filter(activity => activityKind(activity) === kind).reduce((sum, activity) => sum + activityQuantity(activity), 0);
  $('soldTotal').textContent = count('sale');
  $('freeTotal').textContent = count('free');
  $('brokenTotal').textContent = count('broken');
  $('salesMoney').textContent = money(state.sales.reduce((sum, sale) => sum + sale.price * sale.qty, 0));
}

function unlockMoney() {
  if (!state.settings.adultPin) {
    const firstPin = prompt('Create a four-digit PIN for the grown-up summary.');
    if (!/^\d{4}$/.test(firstPin || '')) return alert('Please choose exactly four numbers.');
    const confirmPin = prompt('Enter the PIN one more time.');
    if (confirmPin !== firstPin) return alert('The PINs did not match. Try again.');
    state.settings.adultPin = firstPin;
    save();
  } else if (prompt('Enter the grown-up PIN.') !== state.settings.adultPin) {
    return alert('That PIN is not correct.');
  }
  $('privateReport').hidden = false;
  $('unlockMoney').hidden = true;
  renderPrivateSummary();
}

function setupSimpleInventory() {
  const costGrid = $('grams').closest('.two');
  costGrid.previousElementSibling?.remove();
  costGrid.remove();
  $('profitTarget').closest('label').remove();
  $('suggestion').remove();
  $('askingPrice').parentElement.firstChild.nodeValue = 'Price for one toy ';
  document.querySelector('[data-view="parent"]').remove();
  $('parent').remove();
  document.querySelector('[data-view="money"]').textContent = 'Grown-ups only';
  $('money').innerHTML = `<div class="card parent"><h2>Grown-up money summary</h2><p class="hint">This is for a parent or trusted grown-up.</p><button id="unlockMoney" class="primary">Unlock summary</button><div id="privateReport" hidden><div class="grid" style="margin-top:14px"><div class="stat mint"><span>Toys sold</span><strong id="soldTotal">0</strong></div><div class="stat gold"><span>Given free</span><strong id="freeTotal">0</strong></div><div class="stat"><span>Broken</span><strong id="brokenTotal">0</strong></div></div><p style="margin-bottom:0">Money from sales: <b id="salesMoney">$0.00</b></p></div></div>`;
  $('unlockMoney').onclick = unlockMoney;
  const saleForm = $('saleForm');
  saleForm.querySelector('label').insertAdjacentHTML('afterend', `<label>What happened?<select id="recordType"><option value="sale">I sold it</option><option value="free">I gave it away for free</option><option value="broken">It broke</option></select></label>`);
  $('recordType').addEventListener('change', updateSaleForm);
  updateSaleForm();
}

function updateSaleForm() {
  const isSale = $('recordType').value === 'sale';
  const priceLabel = $('sellPrice').closest('label');
  priceLabel.hidden = !isSale;
  $('sellPrice').required = isSale;
  $('buyer').closest('label').firstChild.nodeValue = isSale ? 'Who bought it? (optional) ' : 'What happened? (optional) ';
}

setupPhotoPicker(); setupSimpleInventory(); setNewToyDefaults(); render(); loadInventory();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
