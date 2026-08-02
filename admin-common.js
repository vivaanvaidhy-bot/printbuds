window.MiniMakerAdmin = (() => {
  const STORAGE_KEY = 'mini-maker-shop-v3';
  const SESSION_KEY = 'mini-maker-shop-admin-unlocked-until';
  const SESSION_MINUTES = 30;
  const defaults = {
    products: [],
    records: [],
    orders: [],
    activities: [],
    photoLibrary: [],
    colorLibrary: [],
    designLibrary: [],
    settings: { lowStockLimit: 2, adultPin: '' }
  };
  const supabaseUrl = (window.MINI_MAKER_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseAnonKey = (window.MINI_MAKER_SUPABASE_ANON_KEY || '').trim();
  const hasSharedInventory = Boolean(supabaseUrl && supabaseAnonKey);
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const today = () => new Date().toISOString().slice(0, 10);
  function loadStateFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        ...defaults,
        ...saved,
        products: Array.isArray(saved.products) ? saved.products : [],
        records: Array.isArray(saved.records) ? saved.records : [],
        orders: Array.isArray(saved.orders) ? saved.orders : [],
        activities: Array.isArray(saved.activities) ? saved.activities : [],
        photoLibrary: Array.isArray(saved.photoLibrary) ? saved.photoLibrary : [],
        colorLibrary: Array.isArray(saved.colorLibrary) ? saved.colorLibrary : [],
        designLibrary: Array.isArray(saved.designLibrary) ? saved.designLibrary : [],
        settings: { ...defaults.settings, ...(saved.settings || {}) }
      };
    } catch {
      return structuredClone(defaults);
    }
  }
  let state = loadStateFromStorage();
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function updateState(next) { state = next; saveState(); }
  function readState() {
    state = loadStateFromStorage();
    return state;
  }
  function sessionUnlocked() {
    const unlockedUntil = Number(sessionStorage.getItem(SESSION_KEY) || '0');
    return Number.isFinite(unlockedUntil) && unlockedUntil > Date.now();
  }
  function unlockSession() {
    sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MINUTES * 60 * 1000));
  }
  function requireAccess() {
    if (sessionUnlocked()) return;
    let current = readState();
    if (!current.settings.adultPin) {
      const firstPin = prompt('Create one four-digit PIN for kids and parents to manage the shop.');
      if (!/^\d{4}$/.test(firstPin || '')) {
        document.body.innerHTML = '<main style="max-width:520px;margin:40px auto;padding:0 16px"><div style="background:#fff;border:1px solid #e4e3ee;border-radius:19px;padding:24px"><h1 style="margin-top:0">Dashboard locked</h1><p>Please reload and choose exactly four numbers.</p><p><a href="./index.html">Go to customer order page</a></p></div></main>';
        throw new Error('PIN required');
      }
      const confirmPin = prompt('Enter the PIN one more time.');
      if (confirmPin !== firstPin) {
        document.body.innerHTML = '<main style="max-width:520px;margin:40px auto;padding:0 16px"><div style="background:#fff;border:1px solid #e4e3ee;border-radius:19px;padding:24px"><h1 style="margin-top:0">Dashboard locked</h1><p>The PINs did not match.</p><p><a href="./index.html">Go to customer order page</a></p></div></main>';
        throw new Error('PIN mismatch');
      }
      current.settings.adultPin = firstPin;
      updateState(current);
      unlockSession();
    } else if (prompt('Enter the shop PIN.') !== current.settings.adultPin) {
      document.body.innerHTML = '<main style="max-width:520px;margin:40px auto;padding:0 16px"><div style="background:#fff;border:1px solid #e4e3ee;border-radius:19px;padding:24px"><h1 style="margin-top:0">Dashboard locked</h1><p>Ask a parent or shop helper for the 4-digit PIN, then open the dashboard again.</p><p><a href="./index.html">Go to customer order page</a></p></div></main>';
      throw new Error('Wrong PIN');
    } else {
      unlockSession();
    }
  }
  async function supabaseRequest(path, options = {}) {
    const { method = 'GET', body, prefer } = options;
    const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
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
  function productFromRow(row) {
    return { id: row.id, name: row.name, qty: Number(row.qty), price: Number(row.price), photo: row.photo || '', variants: Array.isArray(row.variants) ? row.variants : [], createdAt: row.created_at };
  }
  function recordFromRow(row) {
    return { id: row.id, productId: row.product_id, name: row.product_name, qty: Number(row.qty), price: Number(row.price || 0), color: row.color || 'Standard', buyer: row.buyer || '', date: row.occurred_on || today(), recordType: row.record_type };
  }
  function orderFromRow(row) {
    return { id: row.id, productId: row.product_id, name: row.product_name, qty: Number(row.qty), color: row.color || 'Standard', customer: row.customer_name, contact: row.contact, note: row.note || '', status: row.status, createdAt: row.created_at };
  }
  async function loadSharedData() {
    if (!hasSharedInventory) return readState();
    const local = loadStateFromStorage();
    state = local;
    state.colorLibrary = await supabaseRequest('color_library?select=id,name,photo,created_at&order=created_at.asc');
    state.designLibrary = await supabaseRequest('design_library?select=id,name,photo,created_at&order=created_at.asc');
    state.products = (await supabaseRequest('inventory_items?select=id,name,qty,price,photo,variants,created_at&order=created_at.asc')).map(productFromRow);
    state.records = (await supabaseRequest('sale_events?select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at&order=created_at.desc')).map(recordFromRow);
    state.orders = (await supabaseRequest('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at&order=created_at.desc')).map(orderFromRow);
    saveState();
    return state;
  }
  async function createColor(input) {
    if (hasSharedInventory) {
      const rows = await supabaseRequest('color_library?select=id,name,photo,created_at', { method: 'POST', body: { id: crypto.randomUUID(), ...input }, prefer: 'return=representation' });
      const created = rows[0];
      state.colorLibrary.push(created);
      saveState();
      return created;
    }
    const created = { id: crypto.randomUUID(), ...input };
    state.colorLibrary.push(created);
    saveState();
    return created;
  }
  async function createDesign(input) {
    if (hasSharedInventory) {
      const rows = await supabaseRequest('design_library?select=id,name,photo,created_at', { method: 'POST', body: { id: crypto.randomUUID(), ...input }, prefer: 'return=representation' });
      const created = rows[0];
      state.designLibrary.push(created);
      saveState();
      return created;
    }
    const created = { id: crypto.randomUUID(), ...input };
    state.designLibrary.push(created);
    saveState();
    return created;
  }
  async function createInventoryItem(input) {
    if (hasSharedInventory) {
      const rows = await supabaseRequest('inventory_items?select=id,name,qty,price,photo,variants,created_at', { method: 'POST', body: { id: crypto.randomUUID(), ...input }, prefer: 'return=representation' });
      const created = productFromRow(rows[0]);
      state.products.push(created);
      saveState();
      return created;
    }
    const created = { id: crypto.randomUUID(), ...input };
    state.products.push(created);
    saveState();
    return created;
  }
  async function updateInventoryItem(id, patch) {
    if (hasSharedInventory) {
      const rows = await supabaseRequest(`inventory_items?id=eq.${encodeURIComponent(id)}&select=id,name,qty,price,photo,variants,created_at`, { method: 'PATCH', body: patch, prefer: 'return=representation' });
      const updated = productFromRow(rows[0]);
      const index = state.products.findIndex(item => item.id === id);
      if (index >= 0) state.products[index] = updated;
      saveState();
      return updated;
    }
    const product = state.products.find(item => item.id === id);
    Object.assign(product, patch);
    saveState();
    return product;
  }
  async function createRecord(input) {
    if (hasSharedInventory) {
      const rows = await supabaseRequest('sale_events?select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at', { method: 'POST', body: { id: crypto.randomUUID(), ...input }, prefer: 'return=representation' });
      const created = recordFromRow(rows[0]);
      state.records.unshift(created);
      saveState();
      return created;
    }
    const created = { id: crypto.randomUUID(), ...input };
    state.records.unshift(created);
    saveState();
    return created;
  }
  async function updateOrder(id, status) {
    if (hasSharedInventory) {
      const rows = await supabaseRequest(`customer_orders?id=eq.${encodeURIComponent(id)}&select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at`, { method: 'PATCH', body: { status, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
      const updated = orderFromRow(rows[0]);
      const index = state.orders.findIndex(item => item.id === id);
      if (index >= 0) state.orders[index] = updated;
      saveState();
      return updated;
    }
    const order = state.orders.find(item => item.id === id);
    if (order) order.status = status;
    saveState();
    return order;
  }
  function colorChip(variant) {
    const thumbnail = variant.photo ? `<img src="${variant.photo}" alt="${esc(variant.color)}" style="width:18px;height:18px;border-radius:999px;object-fit:cover;vertical-align:middle;margin-right:6px">` : '';
    return `<span style="display:inline-flex;align-items:center;background:#dff8ee;padding:3px 7px;border-radius:999px;font-size:12px;font-weight:800;margin:2px">${thumbnail}${esc(variant.color)} ${money(variant.price)}</span>`;
  }
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) state = loadStateFromStorage();
  });
  return { $, esc, money, today, hasSharedInventory, readState, updateState, saveState, requireAccess, loadSharedData, createColor, createDesign, createInventoryItem, updateInventoryItem, createRecord, updateOrder, colorChip };
})();
