# QuickMenuJA — Product Requirements Document

## Original Problem Statement
Premium SaaS UI/UX upgrade for QuickMenuJA across:
1. Storefront / Merchant marketing page (white+red theme, floating glass navbar, animated hero)
2. Merchant dashboard (sidebar nav, KPI analytics, chart rendering, loading/error states)
3. Env-var driven branding (Cloud Run + GitHub Pages fallback)
4. Sample menu item injection for empty inventories
5. README.md documentation

## Architecture
- **Backend**: Node.js + Express (server.js) on port 8080
- **Database**: Supabase (mock mode when not configured)
- **Frontend**: Vanilla HTML/CSS/JS (apps/merchant, apps/storefront, apps/admin)
- **Assets**: public/assets/css/ + public/assets/js/
- **Hosting**: Cloud Run (primary), GitHub Pages (static preview)

## User Personas
- **Merchant**: Jamaican food business owner. Needs simple dashboard, menu management, order tracking.
- **Customer**: End user browsing storefront, placing order requests via WhatsApp.
- **Admin**: Platform admin managing stores and analytics.

## Core Requirements (Static)
- Marketing page converts visitors to merchant signups
- Dashboard provides real-time analytics and menu management
- Brand config is externalized via env vars
- Works in mock mode without Supabase for demos

## What's Been Implemented (2026-02-20)
- [x] Floating glass navbar (translucent, pill-shaped, sticky, mobile hamburger)
- [x] White + Red marketing theme (from dark to clean conversion-oriented)
- [x] Animated gradient + grid hero background (CSS-only, prefers-reduced-motion safe)
- [x] Plus Jakarta Sans typography (premium, non-generic)
- [x] Section reveal animations (IntersectionObserver)
- [x] Feature cards with hover lift and glow
- [x] Pricing cards with "Most Popular" badge
- [x] FAQ accordion
- [x] Brand config system (/api/config + data-brand-* attributes)
- [x] GitHub Pages fallback (public/config.js)
- [x] KPI row: Orders 7d, Revenue Est., Orders Today, Menu Items, Best Seller, Worst Seller
- [x] Chart.js analytics: Orders trend, Top items, Fulfillment split
- [x] Demo mode fallback with labeled sample data
- [x] Enhanced UI utilities (skeleton, error, empty state helpers)
- [x] Sample menu item injection (Signature Jerk Chicken) on empty inventory
- [x] CSP updated for Cloudinary images and Google Fonts
- [x] README updated with QA checklist and brand config docs
- [x] Testing agent validation (100% backend, 95%+ frontend)

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (Important)
- Storefront customer page UI upgrade (matching white+red theme)
- Dashboard real data wiring (when Supabase is configured)
- Mobile drawer for dashboard sidebar

### P2 (Nice to Have)
- Dark mode toggle
- Page transition animations (Framer-style)
- Parallax scroll effects on hero
- Notification center in dashboard
- Export analytics to CSV

## Next Tasks
1. Storefront (customer-facing) page UI polish
2. Signup wizard visual refinement
3. Dashboard mobile sidebar drawer
4. Charts with real Supabase data integration
5. Performance audit (Lighthouse)
