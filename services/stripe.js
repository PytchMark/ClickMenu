// Stripe integration service
// Note: Install stripe package with: npm install stripe

let stripe = null;

const initializeStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not configured. Stripe features disabled.');
    return null;
  }
  
  try {
    const Stripe = require('stripe');
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');
    return stripe;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error.message);
    return null;
  }
};

// Initialize on module load
stripe = initializeStripe();

const hasStripe = () => !!stripe;

/**
 * Subscription plan configurations
 */
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'Up to 10 menu items',
      'Basic order management',
      'Customer WhatsApp integration',
      'Basic analytics',
    ],
    limits: {
      maxMenuItems: 10,
      dailySpecials: false,
      liveMenu: false,
      advancedAnalytics: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 2900, // $29.00 in cents
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    features: [
      'Unlimited menu items',
      'Daily specials & live menu',
      'Featured item labels',
      'Advanced analytics',
      'Priority support',
    ],
    limits: {
      maxMenuItems: -1, // unlimited
      dailySpecials: true,
      liveMenu: true,
      advancedAnalytics: true,
    },
  },
  business: {
    name: 'Business',
    price: 9900, // $99.00 in cents
    priceId: process.env.STRIPE_PRICE_ID_BUSINESS,
    features: [
      'Everything in Pro',
      'Multi-location support',
      'Custom branding',
      'Premium analytics & insights',
      'Dedicated account manager',
      'API access',
    ],
    limits: {
      maxMenuItems: -1,
      dailySpecials: true,
      liveMenu: true,
      advancedAnalytics: true,
      multiLocation: true,
      customBranding: true,
    },
  },
};

/**
 * Create a Stripe checkout session for subscription
 */
const createCheckoutSession = async ({ plan, storeId, email, successUrl, cancelUrl }) => {
  if (!hasStripe()) {
    throw new Error('Stripe not configured');
  }

  const planConfig = PLANS[plan];
  if (!planConfig || !planConfig.priceId) {
    throw new Error('Invalid plan or price ID not configured');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        store_id: storeId,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          store_id: storeId,
          plan: plan,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
};

/**
 * Create a billing portal session for subscription management
 */
const createBillingPortalSession = async ({ customerId, returnUrl }) => {
  if (!hasStripe()) {
    throw new Error('Stripe not configured');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  } catch (error) {
    console.error('Stripe billing portal creation failed:', error);
    throw new Error(`Failed to create billing portal: ${error.message}`);
  }
};

/**
 * Handle Stripe webhook events
 */
const handleWebhookEvent = async (payload, signature) => {
  if (!hasStripe()) {
    throw new Error('Stripe not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error(`Webhook Error: ${error.message}`);
  }

  return event;
};

/**
 * Process subscription events
 */
const processSubscriptionEvent = (event) => {
  const subscription = event.data.object;
  const storeId = subscription.metadata?.store_id;
  const plan = subscription.metadata?.plan;

  const updates = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    subscription_status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  };

  if (plan) {
    updates.plan = plan;
  }

  return {
    storeId,
    updates,
  };
};

/**
 * Get subscription details from Stripe
 */
const getSubscription = async (subscriptionId) => {
  if (!hasStripe()) {
    throw new Error('Stripe not configured');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to retrieve subscription:', error);
    throw new Error(`Failed to get subscription: ${error.message}`);
  }
};

/**
 * Cancel a subscription
 */
const cancelSubscription = async (subscriptionId) => {
  if (!hasStripe()) {
    throw new Error('Stripe not configured');
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
};

module.exports = {
  hasStripe,
  PLANS,
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhookEvent,
  processSubscriptionEvent,
  getSubscription,
  cancelSubscription,
};
