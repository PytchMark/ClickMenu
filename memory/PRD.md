# QuickMenuJA - Product Requirements Document

## Original Problem Statement
1. Menu items not adding successfully due to Supabase schema issues
2. Add Item modal UI/UX needed improvement to match platform design  
3. Need image preview before uploading - only upload when saving
4. Storefront not connected to database - needed to display items by store ID

## Architecture
- **Frontend**: Static HTML/JS/CSS served via Node.js Express proxy on port 3000
- **Backend**: Python FastAPI (port 8001) proxying to Node.js Express server (port 8080)
- **Database**: Supabase (user needs to run schema v2)
- **Services**: Stripe (disabled), Cloudinary for images, QR Code generation

## What's Been Implemented (March 2026)

### Session 1: Bug Fix - Menu Items Not Saving
- Installed npm dependencies in `/app` directory
- Fixed `/app/frontend/package.json` start script
- Restarted services to enable Node.js backend

### Session 2: UI/UX Improvements & Schema Fix
1. **New Supabase Schema v2** (`/app/supabase_schema_v2.sql`)
   - Clean schema with proper foreign keys
   - Tables: profiles, menu_items, order_requests, reviews, daily_specials, audit_events
   - Proper indexes for performance
   - **SEED DATA**: Test merchant profile (TASTE1/demo123) + 5 sample menu items + 3 reviews

2. **Redesigned Add Item Modal**
   - Split layout: Preview card (left) + Form fields (right)
   - Premium header with icon and subtitle
   - Organized form sections with icons
   - Modern featured toggle with gold highlight
   - Availability cards (Available/Limited/Sold Out) with color coding
   - Label chips (Top Pick, New, Spicy, Vegan, Popular, Signature)

3. **Live Preview Feature**
   - Real-time preview card updates as user types
   - Featured badge toggles with checkbox
   - Labels appear in preview when selected

4. **Image Preview Before Upload**
   - Images shown locally before saving
   - File validation (image type, 5MB max)
   - Upload only happens when "Save Item" is clicked

### Session 3: Storefront Connection Fix
1. **Fixed UI.js Script**
   - Changed toast container to lazy initialization
   - Resolved "UI is not defined" error on page load
   - Skeleton function now returns HTML string correctly

2. **Storefront Now Working**
   - Auto-loads menu when `?storeId=TASTE1` in URL
   - Displays store header with logo, name, status
   - Shows category filters (Lunch, Dinner, Breakfast)
   - Renders menu items from database via `/api/public/menu`
   - Add to Cart functionality working
   - Complete order submission flow working
   - WhatsApp integration functional

## Test Results (Iteration 8)
- Backend: 100% (10/10 API endpoints)
- Frontend: 100% (All storefront features including order flow)

## Supabase Setup Instructions
1. Go to Supabase Dashboard > SQL Editor
2. Run the contents of `/app/supabase_schema_v2.sql`
3. Create storage bucket named "menu-items" (public access)
4. Update `/app/.env` with your Supabase credentials:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

## Test Credentials
- **Store ID**: TASTE1
- **Password**: demo123

## API Endpoints
- `GET /api/public/menu?storeIds=TASTE1` - Get store + menu items
- `POST /api/public/store/:storeId/orders` - Create order
- `POST /api/merchant/login` - Merchant login
- `GET /api/merchant/items` - Get merchant's menu items
- `POST /api/merchant/items` - Save/update menu item
- `POST /api/merchant/media` - Upload media

## Prioritized Backlog
- P0: None (all critical features implemented)
- P1: 
  - Connect real Supabase database (provide credentials)
  - Configure Supabase storage bucket for images
  - Enable Stripe for payment processing
- P2: 
  - Add video upload support
  - Implement bulk menu item import
  - Add menu item analytics
