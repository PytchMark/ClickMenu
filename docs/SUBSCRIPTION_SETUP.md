# ClickMenu Subscription System Setup Guide

## Overview

ClickMenu now includes a complete subscription-based SaaS system powered by Stripe. This guide covers setup, configuration, and usage.

## Features Added

### 1. **Three-Tier Subscription System**

- **Free Plan** ($0/month)
  - Up to 10 menu items
  - Basic order management
  - WhatsApp integration
  - Basic analytics

- **Pro Plan** ($29/month)
  - Unlimited menu items
  - Daily specials & live menu
  - Featured item labels
  - Advanced analytics
  - Priority support
  - Digital display mode

- **Business Plan** ($99/month)
  - Everything in Pro
  - Multi-location support
  - Custom branding
  - Premium analytics
  - Dedicated account manager
  - API access

### 2. **Merchant Onboarding Flow**

- Self-service signup at `/merchant-signup`
- Multi-step form:
  1. Business information
  2. Store ID selection (max 6 chars, capital start, includes number)
  3. Plan selection
  4. Stripe checkout (for paid plans)
- Automatic account creation
- Stripe subscription integration

### 3. **Live Menu Features (Pro+)**

- Daily specials management
- Rotating menu items
- Special pricing for today's menu
- Digital display mode for restaurant screens

### 4. **GitHub Pages Mock Mode**

- Automatic detection of `github.io` hostname
- Mock data with 2 sample merchants
- Full feature testing without backend

## Database Setup

### Step 1: Run Migration

Execute the following SQL in your Supabase SQL editor:

```sql
-- Located in /docs/migration_subscription.sql
```

This adds:
- Subscription fields to `profiles` table
- `daily_specials` table for Pro+ merchants
- `live_menu_rotations` table for menu management
- Indexes for performance

### Step 2: Verify Schema

Check that these columns exist in `profiles`:
- `plan` (text, default 'free')
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `subscription_status` (text, default 'active')
- `current_period_end` (timestamptz)
- `trial_ends_at` (timestamptz)

## Stripe Configuration

### Step 1: Create Stripe Account

1. Sign up at [https://stripe.com](https://stripe.com)
2. Complete account verification
3. Navigate to **Developers** → **API keys**

### Step 2: Create Products & Prices

1. Go to **Products** in Stripe Dashboard
2. Create two products:

**Pro Plan:**
- Name: ClickMenu Pro
- Price: $29/month (recurring)
- Copy the Price ID (starts with `price_`)

**Business Plan:**
- Name: ClickMenu Business
- Price: $99/month (recurring)
- Copy the Price ID

### Step 3: Setup Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-domain.com/api/billing/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### Step 4: Environment Variables

Add these to your `.env` file or Cloud Run environment:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_BUSINESS=price_...
```

**Important:** Use test keys (`sk_test_`) during development and live keys (`sk_live_`) in production.

## Testing the System

### Local Testing

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Visit signup page:
```
http://localhost:8080/merchant-signup
```

4. Test with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

### GitHub Pages Testing

1. Deploy to GitHub Pages
2. Mock mode automatically activates
3. Test with demo merchants:
   - Store ID: `TASTE1`, Password: `demo123`
   - Store ID: `SPICE2`, Password: `demo456`

## API Endpoints

### Billing Endpoints

**Create Checkout Session**
```
POST /api/billing/create-checkout-session
Body: { "plan": "pro", "storeId": "STORE1", "email": "user@example.com" }
Response: { "sessionId": "...", "url": "https://checkout.stripe.com/..." }
```

**Create Billing Portal Session**
```
POST /api/billing/create-portal-session
Headers: Authorization: Bearer <merchant_token>
Response: { "url": "https://billing.stripe.com/..." }
```

**Webhook Handler**
```
POST /api/billing/webhook
Headers: stripe-signature: ...
Body: <Stripe event payload>
```

### Daily Specials (Pro+ Only)

**Get Daily Specials**
```
GET /api/merchant/daily-specials
Headers: Authorization: Bearer <merchant_token>
Response: { "specials": [...] }
```

**Create/Update Special**
```
POST /api/merchant/daily-specials
Headers: Authorization: Bearer <merchant_token>
Body: {
  "item_id": "SPECIAL-001",
  "title": "Today's Special",
  "description": "...",
  "price": 19.99,
  "image_url": "..."
}
```

**Delete Special**
```
DELETE /api/merchant/daily-specials/:itemId
Headers: Authorization: Bearer <merchant_token>
```

### Public Endpoints

**Check Store ID Availability**
```
POST /api/public/check-store-id
Body: { "storeId": "STORE1" }
Response: { "available": true }
```

**Get Store Daily Specials**
```
GET /api/public/store/:storeId/daily-specials
Response: { "specials": [...] }
```

## Store ID Validation Rules

- Maximum 6 characters
- Must start with a capital letter (A-Z)
- Must contain at least one number (0-9)
- Valid examples: `TASTE1`, `SPICE2`, `GRILL9`, `A1B2C3`
- Invalid examples: `taste1` (no capital), `TASTE` (no number), `TOOLONG1` (>6 chars)

## Subscription Status Values

- `active`: Subscription is current and paid
- `trialing`: In trial period
- `past_due`: Payment failed, subscription still active
- `canceled`: Subscription cancelled
- `incomplete`: Initial payment incomplete

## Feature Gating

Check merchant plan in your code:

```javascript
// Backend (Node.js)
const profile = await supabase.getStoreProfile(storeId);
if (!['pro', 'business'].includes(profile.plan)) {
  return res.status(403).json({ error: "Pro plan required" });
}

// Frontend (JavaScript)
const merchantData = await Api.merchant.me();
const isPro = ['pro', 'business'].includes(merchantData.profile.plan);
if (isPro) {
  // Show Pro features
}
```

## Troubleshooting

### Webhook Not Working

1. Verify webhook URL is publicly accessible
2. Check that `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Review webhook logs in Stripe Dashboard → Developers → Webhooks
4. Ensure server accepts `application/json` raw body for webhook endpoint

### Checkout Redirects to Wrong URL

1. Check `successUrl` and `cancelUrl` in checkout session creation
2. Verify `CORS_ORIGINS` includes your frontend domain
3. Test with Stripe test mode first

### Subscription Not Updating

1. Check database `subscription_status` field
2. Review webhook event processing logs
3. Verify metadata includes `store_id` in subscription
4. Test webhook manually using Stripe CLI:
   ```bash
   stripe trigger customer.subscription.updated
   ```

## Security Considerations

1. **Never expose Stripe Secret Key** to frontend
2. **Always validate webhook signatures** using `STRIPE_WEBHOOK_SECRET`
3. **Use HTTPS** in production (required by Stripe)
4. **Implement rate limiting** on checkout endpoint
5. **Validate Store ID** format server-side
6. **Check subscription status** before granting Pro features

## Mock Data for Testing

Two demo merchants are included:

**Kingston Taste Kitchen** (Pro Plan)
- Store ID: `TASTE1`
- Password: `demo123`
- Features: Caribbean Fusion, Daily Specials

**Island Spice Grill** (Business Plan)
- Store ID: `SPICE2`
- Password: `demo456`
- Features: Jamaican BBQ, Premium Features

## Next Steps

1. ✅ Run database migration
2. ✅ Configure Stripe credentials
3. ✅ Test signup flow locally
4. ✅ Test Stripe checkout with test cards
5. ✅ Configure webhook endpoint
6. ✅ Deploy to production
7. ✅ Switch to Stripe live mode
8. ✅ Monitor subscription events

## Support

For issues or questions:
- Check Stripe Dashboard logs
- Review server console for errors
- Test webhook delivery in Stripe
- Verify environment variables are set
