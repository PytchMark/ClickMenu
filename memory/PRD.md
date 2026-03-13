# QuickMenuJA - Product Requirements Document

## Original Problem Statement
QuickMenuJA merchant portal needed production readiness with:
- Premium UI/UX overhaul for merchant portal
- Stripe integration fix (subscriptions)
- Migration from Cloudinary to Supabase for image storage
- Smooth, reliable menu item management via modal workflow
- Live Menu feature for Growth+ plans

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS (not React)
- **Backend**: Node.js Express server on port 3000
- **Proxy**: Python FastAPI on port 8001 (forwards /api/* to Node)
- **Database**: MongoDB via Supabase (mock mode when not configured)
- **Auth**: JWT tokens for merchant authentication
- **Payments**: Stripe for subscriptions

## User Personas
1. **Merchant/Restaurant Owner**: Primary user managing their digital menu
2. **Customer**: Views storefront menus and places orders
3. **Admin**: Platform administrator (separate admin app)

## Core Requirements
- Merchant signup with 14-day free trial (card required)
- Menu item CRUD with modal-based workflow
- Order inbox management
- Dashboard analytics (KPIs, charts)
- Profile management
- Billing/subscription management
- Live Menu feature (Pro/Growth plans only)

---

## What's Been Implemented

### Session 1 (Date: 2026-03-13)

#### Production Readiness Fixes
- [x] Fixed JavaScript null reference errors preventing navigation
- [x] Updated CSP to allow CDN scripts (Chart.js, Stripe.js, FontAwesome)
- [x] Fixed Stripe initialization with emergent test key
- [x] Removed failing Cloudinary video background

#### Premium UI/UX Overhaul
- [x] Added Playfair Display + DM Sans font pairing
- [x] Enhanced KPI cards with glassmorphism effects
- [x] Premium modal styling with backdrop blur
- [x] Sidebar with active state indicator bars
- [x] Loading spinner animations
- [x] Gold accent color for premium features

#### Trial & Pricing Updates
- [x] Changed from 30-day to 14-day free trial
- [x] Removed "No credit card required" messaging
- [x] Added "Live Menu & Daily Specials" to Growth/Pro plan features

#### Live Menu Feature (New)
- [x] Live Menu panel in dashboard sidebar (PRO badge)
- [x] Plan gating for Growth+ subscribers
- [x] Daily Specials section:
  - Create/Edit/Delete specials modal
  - Special pricing, quantity limits, expiration time
  - Activate/pause functionality
- [x] Time-Based Menus section:
  - Enable/disable toggle
  - Breakfast/Lunch/Dinner time slot configuration
- [x] Quick Availability toggles for menu items
- [x] Plan returned in merchant login response

---

## Prioritized Backlog

### P0 (Critical for Launch)
- [ ] Supabase production credentials configuration
- [ ] Stripe products/prices creation in Stripe dashboard
- [ ] Stripe webhook endpoint configuration

### P1 (High Priority)
- [ ] Daily specials persistence to database
- [ ] Time-based menu enforcement on storefront
- [ ] Live Menu display on public storefront
- [ ] Card requirement enforcement at signup (Stripe checkout)

### P2 (Nice to Have)
- [ ] Quick Stats email digest feature
- [ ] Push notifications for order updates
- [ ] Menu item bulk import/export
- [ ] Multi-language support

### P3 (Future)
- [ ] Multi-branch support
- [ ] Custom branding options
- [ ] Advanced analytics dashboard
- [ ] Mobile app for merchants

---

## Next Tasks
1. Configure Supabase credentials in deployment environment
2. Set up Stripe products and webhook
3. Persist daily specials to database
4. Display specials on customer storefront
5. Enforce time-based menus on storefront

## Technical Debt
- Remove remaining Cloudinary references once Supabase storage is fully configured
- Clean up mock data from supabase.js service
