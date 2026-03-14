# Quick Menu JA - Product Requirements Document

## Original Problem Statement
Digital menu platform for Jamaican restaurants with:
- Professional merchant portal with "luxe" UI design
- QR code generation for menus
- WhatsApp ordering integration
- Customer reviews and ratings
- Live Menu feature for daily specials
- Supabase integration for database
- Marketing landing page

## Architecture
- **Backend**: Node.js/Express (server.js)
- **Frontend**: Vanilla JavaScript SPA (merchant.html, merchant.js)
- **Database**: Supabase (PostgreSQL)
- **Proxy**: Python/FastAPI (backend/server.py)
- **Storage**: Supabase Storage (migrating from Cloudinary)

## User Personas
1. **Merchants**: Restaurant owners who manage menus, view orders, track reviews
2. **Customers**: End users who view menus, place orders, leave reviews
3. **Admins**: Platform administrators managing stores

## Core Requirements (Static)
- Merchant authentication and profile management
- Menu item CRUD operations
- QR code generation for storefronts
- WhatsApp-based ordering
- Customer reviews and ratings
- Daily specials (Live Menu - PRO feature)
- Billing and subscription management

## What's Been Implemented

### Session: March 14, 2026
1. **Supabase Integration** (P0) ✅
   - Connected to production Supabase database
   - Mock mode disabled, real data persistence enabled
   - Created setup script with test data seeding

2. **QR Code Generator** ✅
   - Backend: GET /api/merchant/qr-code endpoint
   - Frontend: Generate and download buttons in Profile section
   - Uses 'qrcode' npm package

3. **Review System** ✅
   - Backend: GET/POST /api/public/store/:storeId/reviews
   - Backend: GET /api/merchant/reviews
   - Frontend: Rating stats display, review list, distribution chart
   - Note: Reviews use mock data (reviews table not in Supabase yet)

4. **Review Request Feature** ✅
   - WhatsApp integration for requesting reviews from customers
   - Input for customer phone number
   - Auto-generates message with review link

5. **Marketing Landing Page** ✅
   - Created /apps/marketing/index.html
   - Routes: /marketing, /about
   - Premium dark theme, features grid, pricing section

### Previous Sessions
- UI/UX overhaul with luxe dark theme
- Login flow fixes
- Live Menu feature (PRO gated)
- Storefront preview drawer
- 14-day trial period update

## API Endpoints

### Public
- GET /api/public/store/:storeId - Get store profile
- GET /api/public/store/:storeId/menu - Get menu items
- GET /api/public/store/:storeId/reviews - Get store reviews
- POST /api/public/store/:storeId/reviews - Submit review
- POST /api/public/store/:storeId/orders - Create order

### Merchant (Auth Required)
- POST /api/merchant/login - Authenticate
- GET /api/merchant/me - Get profile
- POST /api/merchant/profile - Update profile
- GET /api/merchant/qr-code - Generate QR code
- GET /api/merchant/reviews - Get store reviews
- GET /api/merchant/menu - Get menu items
- POST /api/merchant/menu - Create/update item

## Database Schema (Supabase)
- `profiles` - Merchant store profiles
- `menu_items` - Menu items with prices, images
- `order_requests` - Customer orders
- `daily_specials` - Live menu specials
- `reviews` - Customer ratings (TO BE CREATED)

## Prioritized Backlog

### P0 (Critical)
- [x] Supabase Integration
- [ ] Create `reviews` table in Supabase

### P1 (Important)
- [x] Marketing Landing Page
- [ ] Remove remaining Cloudinary URLs
- [ ] Stripe payment integration (test key available)

### P2 (Nice to Have)
- [ ] Refactor merchant.js (2000+ lines) into modules
- [ ] Review response feature for merchants
- [ ] Email notifications for orders
- [ ] Multi-location support

## Test Credentials
- **Store ID**: TASTE1
- **Password**: demo123

## Environment Variables
```
SUPABASE_URL=https://wrypjwdtauposrjogmnk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[configured]
JWT_SECRET=[configured]
```

## Next Tasks
1. Create `reviews` table in Supabase Dashboard:
```sql
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  customer_name TEXT DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_store_id ON reviews(store_id);
```

2. Replace Cloudinary image URLs with Supabase Storage
3. Complete Stripe subscription flow

## Files of Reference
- `/app/server.js` - Main backend
- `/app/services/supabase.js` - Database service
- `/app/public/assets/js/merchant.js` - Frontend logic
- `/app/apps/merchant/index.html` - Dashboard HTML
- `/app/apps/marketing/index.html` - Landing page
