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
- Merchant signup: http://localhost:8080/merchant-signup
- Admin console: http://localhost:8080/admin

## New Features (v2.0)

### Subscription System

ClickMenu now offers three subscription tiers:

1. **Free** ($0/month) - Up to 10 items, basic features
2. **Pro** ($29/month) - Unlimited items, daily specials, live menu
3. **Business** ($99/month) - Multi-location, premium analytics, API access

See [SUBSCRIPTION_SETUP.md](docs/SUBSCRIPTION_SETUP.md) for complete setup instructions.

### Self-Service Onboarding

- Merchants can sign up at `/merchant-signup`
- Choose custom Store ID (max 6 chars, capital start, includes number)
- Select subscription plan
- Automated Stripe checkout for paid plans

### Live Menu Features (Pro+)

- Daily specials management
- Rotating menu items
- Digital display mode for restaurant screens
- Today's special pricing

### GitHub Pages Support

- Automatic mock mode on `github.io` domains
- Two demo merchants with full feature sets
- Test without backend setup

## Environment Variables

Create a `.env` file using `.env.example` as a template.

Required for Supabase mode:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

Recommended:

- `NODE_ENV`
- `PORT`

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

Stripe (required for subscriptions):

- `STRIPE_SECRET_KEY` (sk_test_... or sk_live_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_...)
- `STRIPE_PRICE_ID_PRO` (price_... for Pro plan)
- `STRIPE_PRICE_ID_BUSINESS` (price_... for Business plan)

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the server runs in mock mode with sample data.
If `JWT_SECRET` is missing in production, the server exits with an error so tokens are never issued without a secret.
If Stripe keys are missing, subscription features will be disabled but the app will still function in free mode.

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

-- Optional: status constraints
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
  -d '{"storeIdOrEmail":"TACOS01","passcode":"tacos123"}'
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

### Required Environment Variables

Copy `.env.example` to `.env` and configure the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Auto | Cloud Run sets this (default: 8080) |
| `NODE_ENV` | Yes | Set to `production` |
| `JWT_SECRET` | Yes | Secret for JWT tokens. Generate with `openssl rand -hex 32` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |

### Admin Authentication
| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_USERNAME` | Yes | Admin login username |
| `ADMIN_EMAIL` | Optional | Alternative admin identifier |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `ADMIN_API_KEY` | Optional | API key for service-to-service calls |

### Supabase (Database)
| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (not anon key) |
| `SUPABASE_DB_URL` | Optional | Direct Postgres connection string |

### Stripe (Subscriptions)
| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (sk_live_... or sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (whsec_...) |
| `STRIPE_PRICE_ID_PLAN1` | Yes | Price ID for Starter plan ($19/mo) |
| `STRIPE_PRICE_ID_PLAN2` | Yes | Price ID for Growth plan ($36/mo) |
| `STRIPE_PRICE_ID_PLAN3` | Yes | Price ID for Pro plan ($79/mo) |
| `PUBLIC_BASE_URL` | Yes | Your app's public URL for Stripe redirects |

### Cloudinary (Media Uploads)
| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Yes | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | Optional | Upload folder template |

### Optional Branding
| Variable | Required | Description |
|----------|----------|-------------|
| `DEFAULT_HERO_VIDEO_URL` | No | Default hero video for storefront |
| `BRAND_NAME` | No | Custom brand name (default: ClickMenu) |

### Build and Test Locally

```bash
docker build -t clickmenu .
docker run -p 8080:8080 --env-file .env clickmenu
```

### Deploy to Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT/clickmenu

# Deploy to Cloud Run
gcloud run deploy clickmenu \
  --image gcr.io/YOUR_PROJECT/clickmenu \
  --region YOUR_REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,JWT_SECRET=your-secret,..."

# Or deploy from source (auto-builds Dockerfile)
gcloud run deploy clickmenu \
  --source . \
  --region YOUR_REGION \
  --allow-unauthenticated
```

### Setting Environment Variables in Cloud Run Console

1. Go to Cloud Run in Google Cloud Console
2. Select your service
3. Click "Edit & Deploy New Revision"
4. Scroll to "Variables & Secrets"
5. Add each environment variable from the tables above
6. Click "Deploy"

