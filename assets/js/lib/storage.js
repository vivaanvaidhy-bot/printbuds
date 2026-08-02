window.MiniMakerStorage = (() => {
  const { storageKey, state: defaults } = window.MiniMakerDefaults;

  function cloneDefaults() {
    return structuredClone(defaults);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
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
      return cloneDefaults();
    }
  }

  function saveState(state) {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function withLocalState(mutator) {
    const state = loadState();
    const result = mutator(state);
    saveState(state);
    return result;
  }

  return { storageKey, cloneDefaults, loadState, saveState, withLocalState };
})();
