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
- `JWT_SECRET`
- `ADMIN_API_KEY` (optional, for service-to-service admin calls)

Media (Cloudinary):

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (template allowed: `clickmenu/stores/{storeId}/items/{itemId}`)

Optional:

- `CORS_ORIGINS` (comma-separated)
- `PORT`
- `DEFAULT_HERO_VIDEO_URL`
- `BRAND_NAME`
- `SUPABASE_DB_URL` (optional, only if used)

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the server runs in mock mode with sample data.
If `JWT_SECRET` is missing in production, the server exits with an error so tokens are never issued without a secret.

## Admin Portal CSP Notes

The admin portal avoids inline scripts/styles and loads its controller from `/public/assets/js/admin.js` with a dedicated stylesheet in `/public/assets/css/admin.css`. This keeps Helmet CSP defaults compatible without needing `unsafe-inline`. 

## Cloudinary Media Uploads

Uploads are stored in Cloudinary using the folder template:

```
clickmenu/stores/{storeId}/items/{itemId}
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
  labels jsonb,
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
create index if not exists idx_order_requests_status on order_requests(status);

-- Top items requested (example)
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
```

You can also apply the same schema from `supabase_schema.sql`.

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
- `SUPABASE_DB_URL`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
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
