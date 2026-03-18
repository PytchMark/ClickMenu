# QuickMenuJA - Product Requirements Document

## Original Problem Statement
1. Menu items not adding successfully due to Supabase schema issues
2. Add Item modal UI/UX needed improvement to match platform design
3. Need image preview before uploading - only upload when saving

## Architecture
- **Frontend**: Static HTML/JS/CSS served via Node.js Express proxy on port 3000
- **Backend**: Python FastAPI (port 8001) proxying to Node.js Express server (port 8080)
- **Database**: Supabase (user needs to run new schema)
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
   - Instructions for storage bucket setup

2. **Redesigned Add Item Modal**
   - Split layout: Preview card (left) + Form fields (right)
   - Premium header with icon and subtitle
   - Organized form sections with icons
   - Modern featured toggle with gold highlight
   - Availability cards (Available/Limited/Sold Out) with color coding
   - Label chips (Top Pick, New, Spicy, Vegan, Popular, Signature)
   - Professional dark theme matching platform design

3. **Live Preview Feature**
   - Real-time preview card updates as user types
   - Shows title, description, category, price
   - Featured badge toggles with checkbox
   - Labels appear in preview when selected

4. **Image Preview Before Upload**
   - Images shown locally before saving
   - File validation (image type, 5MB max)
   - Upload only happens when "Save Item" is clicked
   - Clear feedback: "Image ready for upload" toast

## Test Results (Iteration 7)
- Backend: 100% (6/6 API endpoints)
- Frontend: 95% (1 minor automated testing issue)

## Supabase Setup Instructions
1. Go to Supabase Dashboard > SQL Editor
2. Run the contents of `/app/supabase_schema_v2.sql`
3. Create storage bucket named "menu-items" (public access)
4. Update `/app/.env` with your Supabase credentials

## Prioritized Backlog
- P0: None (all critical features implemented)
- P1: 
  - Connect real Supabase database (provide credentials)
  - Enable Stripe for payment processing
- P2: 
  - Add video upload support
  - Implement bulk menu item import
  - Add menu item analytics
