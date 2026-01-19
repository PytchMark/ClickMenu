# ClickMenu

ClickMenu is a viral-first, zero-friction clickable menu + order request system that converts social traffic into real orders without forcing restaurants to build a website or integrate payments.

## Features

- Public storefront: browse menu items, build a cart-style request, send an order inquiry, optional WhatsApp CTA.
- Merchant portal: manage menu items, upload images, toggle availability, see incoming requests.
- Admin console: create stores, reset passcodes, view orders + KPI summary.
- Mock mode: runs without Supabase credentials using in-memory demo data.

## Tech Stack

- Node.js + Express
- Supabase (server-side service role key)
- Vanilla HTML/CSS/JS

## Quick Start

```bash
npm install
npm start
```

Visit:

- Storefront: http://localhost:8080/storefront
- Merchant portal: http://localhost:8080/merchant
- Admin console: http://localhost:8080/admin

## Environment Variables

Create a `.env` file using `.env.example` as a template.

Required for Supabase mode:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

Admin auth:

- `ADMIN_USERNAME` or `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Optional:

- `CORS_ORIGINS` (comma-separated)
- `PORT`
- `DEFAULT_HERO_VIDEO_URL`
- `BRAND_NAME`

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the server runs in mock mode with sample data.

## Supabase Storage

Create a public bucket named `menu-media` for merchant uploads. Images are stored at:

```
stores/{storeId}/items/{itemId}/<filename>
```

## SQL Schema (copy/paste)

```sql
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
```

## API Examples

```bash
curl http://localhost:8080/api/public/store/TACOS01
```

```bash
curl http://localhost:8080/api/public/store/TACOS01/menu
```

```bash
curl -X POST http://localhost:8080/api/public/store/TACOS01/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Ava",
    "customerPhone": "+15550001111",
    "fulfillmentMethod": "pickup",
    "parish": "Kingston",
    "locationDetails": "Pickup counter",
    "items": [{"itemId":"FOOD-001","title":"Birria Taco Trio","qty":1,"price":14}]
  }'
```

```bash
curl -X POST http://localhost:8080/api/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"storeIdOrEmail":"TACOS01","password":"tacos123"}'
```

```bash
curl -X POST http://localhost:8080/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"changeme"}'
```

## Deployment Notes

- Set `NODE_ENV=production` and ensure `JWT_SECRET` is configured.
- Provide Supabase env vars to switch from mock mode to persistent storage.
- Host on any Node-compatible platform (Cloud Run, Render, Railway, Fly.io, etc.).

## Cloud Run (Docker) Deployment

Required environment variables (see `.env.example`):

- `PORT` (Cloud Run sets this automatically; default is `8080`)
- `NODE_ENV`
- `CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_API_KEY`
- `DEFAULT_HERO_VIDEO_URL`
- `BRAND_NAME`

Build and test locally:

```bash
docker build -t clickmenu .
docker run -p 8080:8080 --env-file .env clickmenu
```

Deploy to Cloud Run (high level):

```bash
gcloud run deploy clickmenu \
  --source . \
  --region YOUR_REGION \
  --allow-unauthenticated
```
