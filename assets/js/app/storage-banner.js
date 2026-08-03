window.MiniMakerStorageBanner = (() => {
  function mount() {
    const shared = Boolean(window.MiniMakerApiClient?.hasSharedInventory);
    const banner = document.createElement('div');
    banner.className = `storage-banner ${shared ? 'shared' : 'local'}`;
    banner.textContent = shared
      ? 'Using Supabase shared database. Colors, designs, inventory, orders, and sales should load from the shared DB.'
      : 'Using browser-only local storage. Data stays only on this device.';

    const header = document.querySelector('header');
    if (header) header.insertAdjacentElement('afterend', banner);
    else document.body.prepend(banner);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  return { mount };
})();
