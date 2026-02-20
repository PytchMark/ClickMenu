# ClickMenuJa - Product Requirements Document

## Overview
ClickMenuJa is a SaaS web application for food merchants in Jamaica. It provides a storefront for customers, a merchant dashboard for store management, and an admin portal for platform operations.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no React)
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (subscription billing)
- **Media**: Cloudinary (image/video uploads)
- **Deployment**: Google Cloud Run

## Core Features

### 1. Storefront (`/storefront`)
- Customer-facing menu view
- Store search by ID
- Cart/tray builder
- Order request submission via WhatsApp

### 2. Merchant Portal (`/merchant`)
- **Landing Page**: SaaS marketing funnel with pricing
- **Signup Wizard**: 4-step onboarding (Store Info → Branding → Plan → Success)
- **Dashboard**: KPIs, charts, quick actions
- **Menu Manager**: CRUD with plan-based limits
- **Orders Inbox**: Status management, WhatsApp integration
- **Billing**: Plan comparison, usage stats, Stripe integration
- **Profile**: Store customization
- **Settings**: Help guides, session management

### 3. Admin Portal (`/admin`)
- **Overview Dashboard**: KPIs, charts, attention items
- **Merchant Management**: Search, filter, pagination, bulk actions
- **Menu Moderation**: Cross-platform item review
- **Order Management**: Status updates, filtering
- **Analytics**: Platform-wide metrics

## Pricing Plans
| Plan | Price | Items | Images/Item | Videos/Item |
|------|-------|-------|-------------|-------------|
| Starter | $19/mo | 5 | 2 | 0 |
| Growth | $36/mo | 15 | 5 | 1 |
| Pro | $79/mo | Unlimited | 10 | 3 |

## What's Been Implemented

### Phase 1: Merchant Landing Funnel ✅ (Feb 20, 2026)
- New SaaS landing page with hero, features, pricing, FAQ
- Multi-step signup wizard (4 steps)
- View navigation between landing/login/signup/dashboard
- ClickMenu logo branding throughout app

### Phase 2: Merchant Portal Restructure ✅ (Feb 20, 2026)
- Enhanced billing panel with usage stats and plan comparison
- Plan-based menu item limits with warnings
- Upgrade flow with Stripe Checkout placeholders
- CSS improvements for billing and pill variants

### Phase 3: Admin Portal Upgrades ✅ (Feb 20, 2026)
- Enhanced overview dashboard with 4 KPI cards
- Orders trend chart (7 days)
- Merchant distribution pie chart
- Attention items section (flagged, pending, inactive)
- Improved ops pulse with icons

## Backlog (P1)
- [ ] Stripe webhook integration for subscription status
- [ ] Storefront sticky header
- [ ] Trust cues and micro-interactions
- [ ] Dev mode with mock data

## Backlog (P2)
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Mobile app wrapper

## Environment Variables
See `.env.example` and `README.md` for complete list of required Cloud Run environment variables.

## Deployment
```bash
gcloud run deploy clickmenu --source . --region us-central1
```
