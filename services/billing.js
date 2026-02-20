// Stripe Billing Service
// Gracefully handles missing Stripe configuration

let stripe = null;

const PLAN_CONFIGS = {
  plan1: {
    name: 'Starter',
    price: 1900, // $19/mo in cents
    trial_days: 30,
    max_items: 5,
    max_images_per_item: 3,
    max_videos_per_item: 0,
    features: [
      'Max 5 menu items',
      'Up to 3 images per listing',
      '30-day free trial',
      'WhatsApp + request cart',
      'Basic stats',
    ],
  },
  plan2: {
    name: 'Growth',
    price: 3600, // $36/mo in cents
    trial_days: 0,
    max_items: 33,
    max_images_per_item: 6,
    max_videos_per_item: 2,
    features: [
      'Max 33 menu items',
      'Up to 6 images per listing',
      'Up to 2 videos per listing',
      'Advanced stats',
      'Delivery settings',
    ],
  },
  plan3: {
    name: 'Pro',
    price: 7900, // $79/mo in cents
    trial_days: 0,
    max_items: 999999,
    max_images_per_item: 20,
    max_videos_per_item: 10,
    features: [
      'Unlimited items',
      'Unlimited media (reasonable cap)',
      'Full analytics',
      'Priority support',
      'Multi-branch coming soon',
    ],
  },
};

const initializeStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('ℹ️  Stripe not configured (STRIPE_SECRET_KEY missing)');
    return false;
  }

  try {
    const Stripe = require('stripe');
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✓ Stripe initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error.message);
    return false;
  }
};

const hasStripe = () => !!stripe;

const getPlanConfig = (planTier) => {
  return PLAN_CONFIGS[planTier] || PLAN_CONFIGS.plan1;
};

const createCheckoutSession = async ({ storeId, planTier }) => {
  // Validate inputs
  if (!storeId || !planTier) {
    throw new Error('storeId and planTier are required');
  }

  if (!PLAN_CONFIGS[planTier]) {
    throw new Error('Invalid planTier');
  }

  // Check if Stripe is configured
  if (!hasStripe()) {
    return {
      ok: false,
      mode: 'fallback',
      error: 'Stripe not configured',
    };
  }

  // Check required env vars
  const baseUrl = process.env.PUBLIC_BASE_URL;
  const priceId = process.env[`STRIPE_PRICE_ID_${planTier.toUpperCase()}`];

  if (!baseUrl || !priceId) {
    console.log(`Missing: PUBLIC_BASE_URL=${!!baseUrl}, STRIPE_PRICE_ID_${planTier.toUpperCase()}=${!!priceId}`);
    return {
      ok: false,
      mode: 'fallback',
      error: 'Stripe not fully configured',
    };
  }

  try {
    const planConfig = getPlanConfig(planTier);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: planConfig.trial_days,
        metadata: {
          storeId: storeId,
          planTier: planTier,
        },
      },
      metadata: {
        storeId: storeId,
        planTier: planTier,
      },
      success_url: `${baseUrl}/storefront?billing=success&storeId=${encodeURIComponent(storeId)}`,
      cancel_url: `${baseUrl}/storefront?billing=cancel&storeId=${encodeURIComponent(storeId)}`,
    });

    return {
      ok: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    throw new Error(`Failed to create checkout: ${error.message}`);
  }
};

const handleWebhook = async (rawBody, signature) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.log('ℹ️  Stripe webhook received but not verified (STRIPE_WEBHOOK_SECRET missing)');
    return { ok: true, mode: 'placeholder' };
  }

  if (!hasStripe()) {
    console.log('ℹ️  Stripe webhook received but Stripe not initialized');
    return { ok: true, mode: 'placeholder' };
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw new Error(`Webhook Error: ${error.message}`);
  }

  return {
    ok: true,
    event: event,
  };
};

const processCheckoutComplete = (event) => {
  const session = event.data.object;
  const storeId = session.metadata?.storeId;
  const planTier = session.metadata?.planTier;

  if (!storeId || !planTier) {
    console.warn('Webhook: Missing metadata', { storeId, planTier });
    return null;
  }

  return {
    storeId,
    planTier,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    status: 'active',
  };
};

// Initialize on module load
initializeStripe();

module.exports = {
  hasStripe,
  PLAN_CONFIGS,
  getPlanConfig,
  createCheckoutSession,
  handleWebhook,
  processCheckoutComplete,
};
