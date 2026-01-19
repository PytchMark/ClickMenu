create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  store_id text unique not null,
  name text not null,
  status text not null default 'active',
  whatsapp text,
  profile_email text,
  cuisine_type text,
  password text,
  logo_url text,
  business_address text,
  parish text,
  owner_name text,
  owner_phone text,
  owner_email text,
  hours text,
  about text,
  instagram text,
  tiktok text,
  pickup_enabled boolean default true,
  delivery_enabled boolean default true,
  authorized boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references profiles(store_id) on update cascade on delete cascade,
  item_id text not null,
  title text not null,
  description text,
  category text not null,
  price numeric,
  labels jsonb default '[]'::jsonb,
  featured boolean default false,
  status text not null default 'available',
  image_url text,
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id, item_id)
);

create table if not exists order_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text unique not null,
  store_id text not null references profiles(store_id) on update cascade on delete cascade,
  status text not null default 'new',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  items_json jsonb not null,
  fulfillment_type text not null default 'pickup',
  parish text,
  delivery_address text,
  delivery_notes text,
  preferred_time text,
  subtotal numeric,
  source text default 'storefront',
  created_at timestamptz default now()
);

alter table menu_items
  add constraint menu_items_status_check
  check (status in ('available', 'limited', 'sold_out', 'hidden'));

alter table order_requests
  add constraint order_requests_status_check
  check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'canceled'));

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_store_id on profiles(store_id);
create index if not exists idx_profiles_profile_email on profiles(profile_email);
create index if not exists idx_menu_items_store_id on menu_items(store_id);
create index if not exists idx_order_requests_store_id_created_at on order_requests(store_id, created_at desc);
create index if not exists idx_order_requests_status on order_requests(status);

create or replace view top_items_requested as
select
  store_id,
  item->>'itemId' as item_id,
  item->>'title' as title,
  count(*) as total_requests
from order_requests,
  jsonb_array_elements(items_json) as item
group by store_id, item->>'itemId', item->>'title'
order by total_requests desc;
