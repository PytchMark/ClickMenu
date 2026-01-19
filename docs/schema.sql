create extension if not exists "pgcrypto";

-- Profiles (merchant credentials)
create table if not exists profiles (
  store_id text primary key,
  profile_email text,
  password text,
  name text,
  whatsapp text,
  logo_url text,
  status text default 'active',
  cuisine text,
  description text,
  hours text,
  address text,
  parish text,
  owner_name text,
  owner_phone text,
  owner_email text,
  instagram text,
  tiktok text,
  pickup_enabled boolean default true,
  delivery_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Menu items
create table if not exists menu_items (
  store_id text not null references profiles(store_id) on update cascade on delete cascade,
  item_id text primary key,
  title text,
  description text,
  category text,
  price numeric,
  available boolean default true,
  limited boolean default false,
  featured boolean default false,
  labels text[] default '{}',
  image_url text,
  video_url text,
  request_count int default 0,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order requests
create table if not exists order_requests (
  request_id text primary key,
  store_id text not null references profiles(store_id) on update cascade on delete cascade,
  status text default 'new',
  fulfillment text,
  parish text,
  location_details text,
  preferred_time text,
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  cart jsonb,
  total_items int,
  estimated_total numeric,
  created_at timestamptz default now()
);

create index if not exists idx_menu_items_store_id on menu_items(store_id);
create index if not exists idx_order_requests_store_id_status on order_requests(store_id, status);

-- RLS is disabled (service role used server-side)
