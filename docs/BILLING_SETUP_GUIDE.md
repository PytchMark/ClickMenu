# QuickMenuJA Billing & Stripe Integration Guide

## Overview

QuickMenuJA now supports a 3-tier subscription system with graceful fallback when Stripe is not configured. The app will run and function normally without Stripe API keys, showing merchants a "payment setup coming next" message.

## Subscription Plans

### Plan 1 - Starter
- **Trial**: 14 Days Free
- **Limits**:
  - Max menu items: 6
  - Max images per item: 3
  - Max videos per item: 0
- **Features**:
  - Add logo
  - Basic menu management
  - Order management

### Plan 2 - Growth
- **Trial**: 17 Days Free
- **Limits**:
  - Max menu items: 33
  - Max images per item: 6
  - Max videos per item: 2
- **Features**:
  - All Starter features
  - Catering booking option
  - Featured/special tags
  - Advanced analytics

### Plan 3 - Unlimited
- **Trial**: None (Premium)
- **Limits**:
  - Max menu items: Unlimited (999999)
  - Max images per item: 9
  - Max videos per item: 6
- **Features**:
  - All Growth features
  - Customizable menu/storefront design
  - Priority support
  - White-label options

### Add-ons
- **Live Menu**: Daily specials and rotating menu items (Boolean)
- **POS Waitlist**: Early access to POS system when launched (Boolean)

---

## Database Schema

### SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add billing columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'plan1',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS max_items int,
  ADD COLUMN IF NOT EXISTS max_images_per_item int DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_videos_per_item int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS addon_live_menu boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_pos_waitlist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Add constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_tier_check
  CHECK (plan_tier IN ('plan1', 'plan2', 'plan3'));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending_payment', 'active', 'paused', 'canceled'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON profiles(plan_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
```

The complete SQL file is in `/app/sql/add_billing_columns.sql`

---

## Environment Variables

### Required Variables (Already set)
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### Optional Billing Variables (App works without these)
```bash
# Your Cloud Run URL
PUBLIC_BASE_URL=https://clickmenu-834003823077.us-central1.run.app

# Stripe API Keys (Test mode for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_ID_PLAN1=price_...
STRIPE_PRICE_ID_PLAN2=price_...
STRIPE_PRICE_ID_PLAN3=price_...
```

---

## Setting Up Stripe (Optional)

### Step 1: Create Stripe Account
1. Sign up at https://stripe.com
2. Complete account verification
3. Navigate to **Dashboard** → **Developers** → **API keys**
4. Copy your **Secret key** (starts with `sk_test_` for test mode)

### Step 2: Create Products & Prices
1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Create three products:

**Product 1: QuickMenuJA Starter**
- Name: QuickMenuJA Starter
- Description: 14-day free trial, then $X/month
- Pricing: Recurring subscription
- Add **Price**: Choose your pricing (e.g., $19/month)
- Trial period: 14 days
- Copy the **Price ID** (starts with `price_`)

**Product 2: QuickMenuJA Growth**
- Name: QuickMenuJA Growth
- Pricing: $X/month (e.g., $49/month)
- Trial: 17 days
- Copy the Price ID

**Product 3: QuickMenuJA Unlimited**
- Name: QuickMenuJA Unlimited
- Pricing: $X/month (e.g., $99/month)
- No trial (or custom)
- Copy the Price ID

### Step 3: Configure Webhook
1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://clickmenu-834003823077.us-central1.run.app/api/billing/webhook`
3. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)

### Step 4: Add to Cloud Run Environment
1. Go to **Google Cloud Console**
2. Navigate to **Cloud Run**
3. Select your **clickmenu** service
4. Click **Edit & Deploy New Revision**
5. Go to **Variables & Secrets** tab
6. Add these environment variables:
   ```
   PUBLIC_BASE_URL=https://clickmenu-834003823077.us-central1.run.app
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_PRICE_ID_PLAN1=price_xxx
   STRIPE_PRICE_ID_PLAN2=price_xxx
   STRIPE_PRICE_ID_PLAN3=price_xxx
   ```
7. Click **Deploy**
8. Wait for deployment to complete

---

## API Endpoints

### 1. Merchant Signup (Public)
```
POST /api/public/merchant/signup
Content-Type: application/json

Body:
{
  \"storeId\": \"GRILL8\" (optional - auto-generated if empty),
  \"name\": \"Island Grill\",
  \"whatsapp\": \"+1 876 555 1234\",
  \"profile_email\": \"hello@islandgrill.com\",
  \"parish\": \"Kingston\",
  \"cuisine\": \"Caribbean\",
  \"description\": \"Best jerk chicken in town\",
  \"logo_url\": \"https://...\",
  \"passcode\": \"securepass123\",
  \"planTier\": \"plan2\",
  \"addonLiveMenu\": true,
  \"addonPosWaitlist\": false
}

Response (Success):
{
  \"ok\": true,
  \"storeId\": \"GRILL8\",
  \"profile\": { ... }
}
```

### 2. Create Checkout Session
```
POST /api/billing/create-checkout-session
Content-Type: application/json

Body:
{
  \"storeId\": \"GRILL8\",
  \"planTier\": \"plan2\"
}

Response (Stripe configured):
{
  \"ok\": true,
  \"url\": \"https://checkout.stripe.com/...\",
  \"sessionId\": \"cs_test_...\"
}

Response (Stripe not configured):
{
  \"ok\": false,
  \"mode\": \"fallback\",
  \"error\": \"Stripe not configured\"
}
```

### 3. Webhook Handler
```
POST /api/billing/webhook
Stripe-Signature: t=xxx,v1=yyy

Body: <Stripe event payload>

Response:
{
  \"received\": true
}
```

---

## How the Flow Works

### With Stripe Configured:
1. User fills out onboarding form on storefront
2. Frontend calls `POST /api/public/merchant/signup`
3. Merchant profile created with `status: pending_payment`
4. Frontend calls `POST /api/billing/create-checkout-session`
5. User redirected to Stripe Checkout
6. User completes payment
7. Stripe sends `checkout.session.completed` webhook
8. Backend updates merchant status to `active`
9. User redirected back to storefront with success message
10. Merchant can now log in

### Without Stripe (Fallback Mode):
1. User fills out onboarding form
2. Frontend calls `POST /api/public/merchant/signup`
3. Merchant profile created with `status: pending_payment`
4. Frontend calls `POST /api/billing/create-checkout-session`
5. Backend returns `{ ok: false, mode: \"fallback\" }`
6. Frontend shows success message: \"Profile created, payment setup coming next\"
7. Displays the generated Store ID
8. Merchant can log in but may have limited features until activated

---

## Storefront Integration

The onboarding modal has been created but needs to be added to the storefront HTML.

### Files Created:
- `/app/public/assets/css/onboarding.css` - Modal styles
- `/app/public/assets/js/onboarding.js` - Modal logic
- `/app/docs/ONBOARDING_HTML_SNIPPET.html` - HTML to add to storefront

### To Add to Storefront:
1. Open `/app/apps/storefront/index.html`
2. Add to `<head>`:
   ```html
   <link rel=\"stylesheet\" href=\"/public/assets/css/onboarding.css\" />
   ```
3. Add before `</body>`:
   ```html
   <script src=\"/public/assets/js/onboarding.js\"></script>
   ```
4. Add the \"Become a Merchant\" button to your hero section
5. Add the modal HTML (see ONBOARDING_HTML_SNIPPET.html)

---

## Testing

### Test in Fallback Mode (No Stripe):
1. Don't set Stripe environment variables
2. Go to storefront
3. Click \"Become a Merchant\"
4. Fill out form and select a plan
5. Submit - should see success message with Store ID
6. Can log in at `/merchant` with Store ID + passcode

### Test with Stripe (Test Mode):
1. Set all Stripe environment variables
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Go through onboarding
4. Should redirect to Stripe Checkout
5. Complete payment
6. Should redirect back with success
7. Webhook should activate account

---

## Production Checklist

Before going live:

- [ ] Run SQL migration in production Supabase
- [ ] Create Stripe products for all 3 plans
- [ ] Set pricing for each plan
- [ ] Configure webhook in Stripe Dashboard
- [ ] Add environment variables to Cloud Run
- [ ] Switch from `sk_test_` to `sk_live_` keys
- [ ] Test full signup flow end-to-end
- [ ] Monitor webhook deliveries in Stripe Dashboard
- [ ] Test fallback mode by temporarily removing Stripe key

---

## Troubleshooting

**Q: Onboarding modal doesn't open**
- Check browser console for JavaScript errors
- Verify onboarding.js is loaded
- Check that button ID is `becomeMerchantBtn`

**Q: Webhook not working**
- Verify webhook URL is publicly accessible
- Check STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
- View webhook logs in Stripe Dashboard → Developers → Webhooks
- Check Cloud Run logs for webhook errors

**Q: Checkout redirects but doesn't activate account**
- Check webhook is configured correctly
- Verify webhook secret is correct
- Check that metadata (storeId, planTier) is included in checkout session
- View Cloud Run logs around the time of checkout

**Q: \"Stripe not configured\" always showing**
- Verify all environment variables are set in Cloud Run
- Check variable names match exactly
- Restart Cloud Run service after adding variables
- Check logs for \"Stripe initialized\" message on startup

---

## Files Modified/Created

**New Files:**
- `/app/sql/add_billing_columns.sql` - Database migration
- `/app/services/billing.js` - Stripe integration service
- `/app/public/assets/css/onboarding.css` - Modal styles
- `/app/public/assets/js/onboarding.js` - Modal JavaScript
- `/app/docs/ONBOARDING_HTML_SNIPPET.html` - HTML template
- `/app/docs/BILLING_SETUP_GUIDE.md` - This file

**Modified Files:**
- `/app/server.js` - Added billing endpoints
- `/app/services/supabase.js` - Added merchant signup functions
- `/app/.env.example` - Added Stripe variables
- `/app/package.json` - Already has stripe dependency

**Not Modified (Safe):**
- `/app/apps/admin/*` - Admin portal unchanged
- `/app/apps/merchant/*` - Merchant portal unchanged
- `/app/services/cloudinary.js` - Media upload unchanged
- All existing API routes intact

---

## Support

For issues:
1. Check Cloud Run logs
2. Check Stripe Dashboard → Developers → Webhooks → Events
3. Verify environment variables are set correctly
4. Test in fallback mode first (without Stripe)
5. Then test with Stripe test mode
6. Finally switch to live mode
