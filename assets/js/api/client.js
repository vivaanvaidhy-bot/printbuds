window.MiniMakerApiClient = (() => {
  const supabaseUrl = (window.MINI_MAKER_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseAnonKey = (window.MINI_MAKER_SUPABASE_ANON_KEY || '').trim();
  const hasSharedInventory = Boolean(supabaseUrl && supabaseAnonKey);

  function authHeaders(body, prefer) {
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    return headers;
  }

  async function request(path, options = {}) {
    const { method = 'GET', body, prefer } = options;
    const headers = authHeaders(body, prefer);
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

  async function requestFunction(name, payload = {}) {
    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: authHeaders(payload),
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Function request failed (${response.status}).`);
    }
    return data;
  }

  return { hasSharedInventory, request, requestFunction };
})();
