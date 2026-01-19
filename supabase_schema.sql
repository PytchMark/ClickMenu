create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  store_id text unique not null,
  name text not null,
  status text not null default 'active',
  whatsapp text,
  profile_email text,
  password text,
  logo_url text,
  theme_json jsonb,
  created_at timestamptz default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references profiles(store_id) on update cascade on delete cascade,
  item_id text not null,
  title text not null,
  description text,
  category text,
  price numeric,
  status text not null default 'available',
  is_featured boolean default false,
  image_urls text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id, item_id)
);

create table if not exists order_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text unique not null,
  store_id text not null references profiles(store_id),
  status text not null default 'new',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  items_json jsonb not null,
  fulfillment_method text not null default 'pickup',
  parish text not null,
  location_details text not null,
  preferred_time text,
  total numeric,
  source text default 'storefront',
  created_at timestamptz default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_store_id on profiles(store_id);
create index if not exists idx_menu_items_store_id on menu_items(store_id);
create index if not exists idx_order_requests_store_id_created_at on order_requests(store_id, created_at desc);
