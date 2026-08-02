window.MiniMakerApiClient = (() => {
  const supabaseUrl = (window.MINI_MAKER_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseAnonKey = (window.MINI_MAKER_SUPABASE_ANON_KEY || '').trim();
  const hasSharedInventory = Boolean(supabaseUrl && supabaseAnonKey);

  async function request(path, options = {}) {
    const { method = 'GET', body, prefer } = options;
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
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

  return { hasSharedInventory, request };
})();
