window.MiniMakerAdmin = (() => {
  const storage = window.MiniMakerStorage;
  const { storageKey } = window.MiniMakerDefaults;
  const SESSION_KEY = 'mini-maker-shop-admin-unlocked-until';
  const SESSION_MINUTES = 30;
  const api = window.MiniMakerApi;
  const hasSharedInventory = api.hasSharedInventory;
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const today = () => new Date().toISOString().slice(0, 10);

  let state = storage.loadState();

  function saveState() {
    storage.saveState(state);
  }

  function updateState(next) {
    state = next;
    saveState();
  }

  function readState() {
    state = storage.loadState();
    return state;
  }

  function sessionUnlocked() {
    const unlockedUntil = Number(sessionStorage.getItem(SESSION_KEY) || '0');
    return Number.isFinite(unlockedUntil) && unlockedUntil > Date.now();
  }

  function unlockSession() {
    sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MINUTES * 60 * 1000));
  }

  function lockScreen(message) {
    document.body.innerHTML = `<main style="max-width:520px;margin:40px auto;padding:0 16px"><div style="background:#fff;border:1px solid #e4e3ee;border-radius:19px;padding:24px"><h1 style="margin-top:0">Dashboard locked</h1><p>${message}</p><p><a href="./index.html">Go to customer order page</a></p></div></main>`;
  }

  async function requireAccess() {
    if (sessionUnlocked()) return;
    const current = readState();

    if (hasSharedInventory) {
      try {
        const pinStatus = await api.adminPin.status();
        if (!pinStatus.configured) {
          const firstPin = prompt('Create one shared four-digit PIN for kids and parents to manage the shop.');
          if (!/^\d{4}$/.test(firstPin || '')) {
            lockScreen('Please reload and choose exactly four numbers.');
            throw new Error('PIN required');
          }
          const confirmPin = prompt('Enter the PIN one more time.');
          if (confirmPin !== firstPin) {
            lockScreen('The PINs did not match.');
            throw new Error('PIN mismatch');
          }
          await api.adminPin.setup(firstPin);
          unlockSession();
          return;
        }

        const enteredPin = prompt('Enter the shared shop PIN.');
        if (!/^\d{4}$/.test(enteredPin || '')) {
          lockScreen('Ask a parent or shop helper for the 4-digit PIN, then open the dashboard again.');
          throw new Error('Wrong PIN');
        }
        const verified = await api.adminPin.verify(enteredPin);
        if (!verified.ok) {
          lockScreen('Ask a parent or shop helper for the 4-digit PIN, then open the dashboard again.');
          throw new Error('Wrong PIN');
        }
        unlockSession();
        return;
      } catch (error) {
        if (!document.body.textContent.includes('Dashboard locked')) {
          lockScreen(error.message || 'Could not verify the shared PIN.');
        }
        throw error;
      }
    }

    if (!current.settings.adultPin) {
      const firstPin = prompt('Create one four-digit PIN for kids and parents to manage the shop.');
      if (!/^\d{4}$/.test(firstPin || '')) {
        lockScreen('Please reload and choose exactly four numbers.');
        throw new Error('PIN required');
      }
      const confirmPin = prompt('Enter the PIN one more time.');
      if (confirmPin !== firstPin) {
        lockScreen('The PINs did not match.');
        throw new Error('PIN mismatch');
      }
      current.settings.adultPin = firstPin;
      updateState(current);
      unlockSession();
      return;
    }
    if (prompt('Enter the shop PIN.') !== current.settings.adultPin) {
      lockScreen('Ask a parent or shop helper for the 4-digit PIN, then open the dashboard again.');
      throw new Error('Wrong PIN');
    }
    unlockSession();
  }

  async function loadSharedData() {
    if (!hasSharedInventory) return readState();
    state = storage.loadState();
    state.colorLibrary = await api.colors.list();
    state.designLibrary = await api.designs.list();
    state.products = await api.inventory.list();
    state.records = await api.sales.list();
    state.orders = await api.orders.list();
    saveState();
    return state;
  }

  async function createColor(input) {
    const created = await api.colors.create(input);
    state.colorLibrary.push(created);
    saveState();
    return created;
  }

  async function createDesign(input) {
    const created = await api.designs.create(input);
    state.designLibrary.push(created);
    saveState();
    return created;
  }

  async function updateColor(id, patch) {
    const updated = await api.colors.update(id, patch);
    const index = state.colorLibrary.findIndex(item => item.id === id);
    if (index >= 0) state.colorLibrary[index] = updated;
    saveState();
    return updated;
  }

  async function deleteColor(id) {
    await api.colors.remove(id);
    state.colorLibrary = state.colorLibrary.filter(item => item.id !== id);
    saveState();
  }

  async function updateDesign(id, patch) {
    const updated = await api.designs.update(id, patch);
    const index = state.designLibrary.findIndex(item => item.id === id);
    if (index >= 0) state.designLibrary[index] = updated;
    saveState();
    return updated;
  }

  async function deleteDesign(id) {
    await api.designs.remove(id);
    state.designLibrary = state.designLibrary.filter(item => item.id !== id);
    saveState();
  }

  async function createInventoryItem(input) {
    const created = await api.inventory.create(input);
    state.products.push(created);
    saveState();
    return created;
  }

  async function updateInventoryItem(id, patch) {
    const updated = await api.inventory.update(id, patch);
    const index = state.products.findIndex(item => item.id === id);
    if (index >= 0) state.products[index] = updated;
    saveState();
    return updated;
  }

  async function deleteInventoryItem(id) {
    await api.inventory.remove(id);
    state.products = state.products.filter(item => item.id !== id);
    saveState();
  }

  async function createRecord(input) {
    const created = await api.sales.create(input);
    state.records.unshift(created);
    saveState();
    return created;
  }

  async function updateRecord(id, patch) {
    const updated = await api.sales.update(id, patch);
    const index = state.records.findIndex(item => item.id === id);
    if (index >= 0) state.records[index] = updated;
    saveState();
    return updated;
  }

  async function deleteRecord(id) {
    await api.sales.remove(id);
    state.records = state.records.filter(item => item.id !== id);
    saveState();
  }

  async function updateOrder(id, patchOrStatus) {
    const patch = typeof patchOrStatus === 'string' ? { status: patchOrStatus } : patchOrStatus;
    const updated = await api.orders.update(id, patch);
    const index = state.orders.findIndex(item => item.id === id);
    if (index >= 0) state.orders[index] = updated;
    saveState();
    return updated;
  }

  function colorChip(variant) {
    const thumbnail = variant.photo ? `<img src="${variant.photo}" alt="${esc(variant.color)}" style="width:18px;height:18px;border-radius:999px;object-fit:cover;vertical-align:middle;margin-right:6px">` : '';
    return `<span style="display:inline-flex;align-items:center;background:#dff8ee;padding:3px 7px;border-radius:999px;font-size:12px;font-weight:800;margin:2px">${thumbnail}${esc(variant.color)} ${money(variant.price)}</span>`;
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey) state = storage.loadState();
  });

  return {
    $,
    esc,
    money,
    today,
    hasSharedInventory,
    readState,
    updateState,
    saveState,
    requireAccess,
    loadSharedData,
    createColor,
    updateColor,
    deleteColor,
    createDesign,
    updateDesign,
    deleteDesign,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    createRecord,
    updateRecord,
    deleteRecord,
    updateOrder,
    colorChip
  };
})();
