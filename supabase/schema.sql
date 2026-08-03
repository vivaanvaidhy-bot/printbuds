create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qty integer not null check (qty >= 0),
  price numeric(10, 2) not null check (price >= 0),
  photo text not null default '',
  variants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.inventory_items(id) on delete cascade,
  product_name text not null,
  qty integer not null check (qty > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  color text not null default '',
  buyer text not null default '',
  record_type text not null check (record_type in ('sale', 'free', 'broken')),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.inventory_items(id) on delete cascade,
  product_name text not null,
  qty integer not null check (qty > 0),
  color text not null default '',
  customer_name text not null,
  contact text not null,
  note text not null default '',
  status text not null default 'pending_print' check (status in ('pending', 'pending_print', 'ready_for_pickup', 'fulfilled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.color_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo text not null default '',
  extra_price numeric(10, 2) not null default 0 check (extra_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.design_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo text not null default '',
  size_category text not null default 'small' check (size_category in ('small', 'medium', 'large')),
  base_price numeric(10, 2) not null default 5 check (base_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.app_admin_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_items enable row level security;
alter table public.sale_events enable row level security;
alter table public.customer_orders enable row level security;
alter table public.color_library enable row level security;
alter table public.design_library enable row level security;
alter table public.app_admin_settings enable row level security;

drop policy if exists "inventory public access" on public.inventory_items;
create policy "inventory public access"
on public.inventory_items
for all
to anon
using (true)
with check (true);

alter table public.inventory_items add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.sale_events add column if not exists color text not null default '';
alter table public.customer_orders add column if not exists color text not null default '';
alter table public.color_library add column if not exists extra_price numeric(10, 2) not null default 0;
alter table public.design_library add column if not exists size_category text not null default 'small';
alter table public.design_library add column if not exists base_price numeric(10, 2) not null default 5;
alter table public.app_admin_settings add column if not exists setting_key text;
alter table public.app_admin_settings add column if not exists pin_hash text;

drop policy if exists "sales public access" on public.sale_events;
create policy "sales public access"
on public.sale_events
for all
to anon
using (true)
with check (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.inventory_items to anon;
grant select, insert, update, delete on public.sale_events to anon;
grant select, insert, update, delete on public.customer_orders to anon;
grant select, insert, update, delete on public.color_library to anon;
grant select, insert, update, delete on public.design_library to anon;
revoke all on public.app_admin_settings from anon;

drop policy if exists "orders public access" on public.customer_orders;
create policy "orders public access"
on public.customer_orders
for all
to anon
using (true)
with check (true);

drop policy if exists "colors public access" on public.color_library;
create policy "colors public access"
on public.color_library
for all
to anon
using (true)
with check (true);

drop policy if exists "designs public access" on public.design_library;
create policy "designs public access"
on public.design_library
for all
to anon
using (true)
with check (true);
