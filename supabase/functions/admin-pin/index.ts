import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const encoder = new TextEncoder();

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    const { data: setting } = await supabase
      .from('app_admin_settings')
      .select('id, pin_hash')
      .eq('setting_key', 'shared_admin_pin')
      .maybeSingle();

    if (action === 'status') {
      return Response.json({ configured: Boolean(setting?.pin_hash) }, { headers: corsHeaders });
    }

    const pin = String(body.pin || '');
    if (!/^\d{4}$/.test(pin)) {
      return Response.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400, headers: corsHeaders });
    }

    const pinHash = await sha256(pin);

    if (action === 'setup') {
      if (setting?.pin_hash) {
        return Response.json({ error: 'Shared PIN is already configured.' }, { status: 409, headers: corsHeaders });
      }

      const { error } = await supabase.from('app_admin_settings').insert({
        setting_key: 'shared_admin_pin',
        pin_hash: pinHash
      });
      if (error) throw error;

      return Response.json({ configured: true }, { headers: corsHeaders });
    }

    if (action === 'verify') {
      return Response.json({ ok: Boolean(setting?.pin_hash) && setting.pin_hash === pinHash }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, { status: 500, headers: corsHeaders });
  }
});
