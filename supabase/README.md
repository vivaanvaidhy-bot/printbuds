# Connect Mini Maker Shop to Supabase

1. Open your Supabase project.
2. Go to the SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. Open **Project Settings > API**.
5. Copy your project URL and your publishable or anon key.
6. Paste them into `supabase-config.js`.
7. Publish the website again.

The app will then share inventory and sale records across iPads.

For the shared admin PIN:

8. Deploy the Supabase Edge Function in `supabase/functions/admin-pin/index.ts`.
9. Keep using the app with the same shared 4-digit PIN across all devices.
