require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const {
  signToken,
  requireAdmin,
  requireMerchant,
} = require("./services/auth");
const { buildMerchantAnalytics } = require("./services/analytics");
const supabase = require("./services/supabase");
const billing = require("./services/billing");
const stripe = require("./services/stripe");

const app = express();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["*"];

const ensureSupabaseConfigured = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  if (supabase.hasSupabase()) {
    return next();
  }
  return res.status(503).json({ ok: false, error: "Supabase not configured" });
};

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "media-src": ["'self'", "https://res.cloudinary.com", "data:"],
      },
    },
  })
);
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/apps", express.static(path.join(__dirname, "apps")));

const sendApp = (folder) => (req, res) => {
  res.sendFile(path.join(__dirname, "apps", folder, "index.html"));
};

app.get("/storefront", sendApp("storefront"));
app.get("/merchant", sendApp("merchant"));
app.get("/merchant-signup", sendApp("signup"));
app.get("/signup", sendApp("signup"));
app.get("/admin", sendApp("admin"));

app.get("/", (req, res) => res.redirect("/storefront"));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mockMode: !supabase.hasSupabase(),
    supabaseConfigured: supabase.hasSupabase(),
  });
});

app.use("/api", ensureSupabaseConfigured);

app.get("/api/public/store/:storeId", async (req, res) => {
  try {
    const profile = await supabase.getStoreProfile(req.params.storeId);
    if (!profile) {
      return res.status(404).json({ ok: false, error: "Store not found" });
    }
    if (profile.authorized === false) {
      return res.status(403).json({ ok: false, error: "Store not authorized" });
    }
    if (profile.status && profile.status !== "active") {
      return res.json({ ok: true, store: profile, paused: true });
    }
    return res.json({ ok: true, store: profile });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/public/store/:storeId/menu", async (req, res) => {
  try {
    const profile = await supabase.getStoreProfile(req.params.storeId);
    if (!profile) {
      return res.status(404).json({ ok: false, error: "Store not found" });
    }
    if (profile.authorized === false) {
      return res.status(403).json({ ok: false, error: "Store not authorized" });
    }
    if (profile.status && profile.status !== "active") {
      return res.status(403).json({ ok: false, error: "Store is not active" });
    }
    const items = await supabase.getMenuItems(req.params.storeId, req.query.all === "1");
    return res.json({ ok: true, items });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/public/menu", async (req, res) => {
  try {
    const storeIds = (req.query.storeIds || "").split(",").map((id) => id.trim());
    if (!storeIds.length || !storeIds[0]) {
      return res.status(400).json({ ok: false, error: "storeIds required" });
    }
    const data = await supabase.getCombinedMenu(storeIds);
    return res.json({ ok: true, ...data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/public/store/:storeId/orders", async (req, res) => {
  try {
    const customerName = req.body.customerName || req.body.customer_name;
    const customerPhone = req.body.customerPhone || req.body.customer_phone;
    const customerEmail = req.body.customerEmail || req.body.customer_email;
    const notes = req.body.notes || null;
    const fulfillmentMethod = req.body.fulfillmentMethod || req.body.fulfillment_method;
    const parish = req.body.parish;
    const locationDetails = req.body.locationDetails || req.body.location_details;
    const deliveryNotes = req.body.deliveryNotes || req.body.delivery_notes;
    const preferredTime = req.body.preferredTime || req.body.preferred_time || null;
    const items = req.body.items || req.body.items_json;
    if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "customerName, customerPhone, items required" });
    }
    if (!fulfillmentMethod || !["pickup", "delivery"].includes(fulfillmentMethod)) {
      return res.status(400).json({ ok: false, error: "fulfillmentMethod required" });
    }
    if (!parish || !locationDetails) {
      return res.status(400).json({ ok: false, error: "parish and locationDetails required" });
    }
    const total =
      typeof req.body.total === "number"
        ? req.body.total
        : items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
    const order = await supabase.createOrderRequest(req.params.storeId, {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      notes,
      items_json: items,
      subtotal: total,
      fulfillment_type: fulfillmentMethod,
      parish,
      delivery_address: locationDetails,
      delivery_notes: deliveryNotes,
      preferred_time: preferredTime,
      source: "storefront",
    });
    const profile = await supabase.getStoreProfile(req.params.storeId);
    const formatMoney = (value) =>
      new Intl.NumberFormat("en-JM", {
        style: "currency",
        currency: "JMD",
        maximumFractionDigits: 0,
      }).format(value || 0);
    const lineItems = items.map(
      (item) =>
        `${item.qty || 0}x ${item.title || "Item"} — ${formatMoney(
          (item.price || 0) * (item.qty || 0)
        )}`
    );
    const message = [
      `Hi ${profile?.name || "there"},`,
      "",
      `Store: ${profile?.name || "Store"}`,
      `Order ID: ${order.request_id}`,
      `Customer: ${customerName}`,
      `Fulfillment: ${fulfillmentMethod} (${parish})`,
      "",
      "Items:",
      ...lineItems,
      `Total: ${formatMoney(total)}`,
      `Location: ${locationDetails}`,
    ].join("\n");
    const whatsappUrl = profile?.whatsapp
      ? `https://wa.me/${profile.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
      : null;
    return res.json({
      ok: true,
      request: { ...order, requestId: order.request_id },
      whatsappUrl,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ============ BILLING & ONBOARDING ENDPOINTS ============

// Public: Merchant Signup
app.post("/api/public/merchant/signup", async (req, res) => {
  try {
    const {
      storeId,
      name,
      whatsapp,
      profile_email,
      parish,
      cuisine,
      description,
      logo_url,
      passcode,
      planTier,
      addonLiveMenu,
      addonPosWaitlist,
    } = req.body;

    // Validate required fields
    if (!name || !whatsapp || !profile_email || !passcode || !planTier) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: name, whatsapp, profile_email, passcode, planTier",
      });
    }

    // Get plan config and limits
    const planConfig = billing.getPlanConfig(planTier);
    const payload = {
      storeId: storeId || null,
      name,
      whatsapp,
      profile_email,
      parish,
      cuisine,
      description,
      logo_url,
      passcode,
      planTier,
      max_items: planConfig.max_items,
      max_images_per_item: planConfig.max_images_per_item,
      max_videos_per_item: planConfig.max_videos_per_item,
      addonLiveMenu: addonLiveMenu || false,
      addonPosWaitlist: addonPosWaitlist || false,
    };

    const result = await supabase.createMerchantProfile(payload);

    return res.json({
      ok: true,
      storeId: result.storeId,
      profile: result.profile,
    });
  } catch (error) {
    console.error("Merchant signup error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Billing: Create Stripe Checkout Session
app.post("/api/billing/create-checkout-session", async (req, res) => {
  try {
    const { storeId, planTier } = req.body;

    if (!storeId || !planTier) {
      return res.status(400).json({
        ok: false,
        error: "storeId and planTier are required",
      });
    }

    const result = await billing.createCheckoutSession({ storeId, planTier });

    // Return result as-is (handles both success and fallback)
    return res.json(result);
  } catch (error) {
    console.error("Create checkout error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Billing: Stripe Webhook
app.post("/api/billing/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      console.log('Webhook: No signature header');
      return res.status(400).json({ error: 'No signature' });
    }

    const result = await billing.handleWebhook(req.body, signature);

    if (result.mode === 'placeholder') {
      return res.json({ received: true, mode: 'placeholder' });
    }

    // Process the event
    const event = result.event;
    console.log(`Webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const update = billing.processCheckoutComplete(event);
      if (update) {
        await supabase.activateMerchantPlan(update.storeId, {
          status: update.status,
          plan_tier: update.planTier,
          stripe_customer_id: update.stripeCustomerId,
          stripe_subscription_id: update.stripeSubscriptionId,
        });
        console.log(`Activated merchant: ${update.storeId} on ${update.planTier}`);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ error: error.message });
  }
});

// ============ MERCHANT ENDPOINTS ============

app.post("/api/merchant/login", async (req, res) => {
  try {
    const { identifier, storeIdOrEmail, password, passcode } = req.body;
    const lookup = identifier || storeIdOrEmail;
    const credential = passcode || password;
    if (!lookup || !credential) {
      return res.status(400).json({ ok: false, error: "Missing credentials" });
    }
    console.info("Merchant login attempt", { identifier: lookup });
    const profile = await supabase.merchantLogin({
      identifier: lookup,
      passcode: credential,
    });
    if (!profile) {
      console.warn("Merchant login failed - profile not found or invalid", { identifier: lookup });
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    console.info("Merchant profile found", { storeId: profile.store_id });
    if (profile.status !== "active") {
      console.warn("Merchant login blocked - status not active", {
        identifier: lookup,
        status: profile.status,
      });
      return res.status(403).json({ ok: false, error: "Store is not active" });
    }
    const token = signToken({ role: "merchant", storeId: profile.store_id });
    console.info("Merchant token issued", { storeId: profile.store_id });
    const merchant = {
      store_id: profile.store_id,
      name: profile.name,
      whatsapp: profile.whatsapp,
      logo_url: profile.logo_url,
      status: profile.status,
      profile_email: profile.profile_email,
    };
    return res.json({ ok: true, token, merchant, profile: merchant });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/merchant/me", requireMerchant, async (req, res) => {
  const profile = await supabase.getStoreProfile(req.user.storeId);
  return res.json({ ok: true, profile });
});

const listMerchantMenu = async (req, res) => {
  try {
    const items = await supabase.getMerchantItems(req.user.storeId);
    return res.json({ ok: true, items });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

app.get("/api/merchant/items", requireMerchant, listMerchantMenu);
app.get("/api/merchant/menu", requireMerchant, listMerchantMenu);

const saveMerchantMenu = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      featured: req.body.featured ?? req.body.is_featured ?? false,
      image_url: req.body.image_url || req.body.imageUrl || null,
      video_url: req.body.video_url || req.body.videoUrl || null,
    };
    if (
      !payload.item_id ||
      !payload.title ||
      !payload.category ||
      payload.price === undefined ||
      payload.price === null ||
      Number.isNaN(Number(payload.price))
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "item_id, title, category, price required" });
    }
    const item = await supabase.upsertMenuItem(req.user.storeId, payload);
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

app.post("/api/merchant/items", requireMerchant, saveMerchantMenu);
app.post("/api/merchant/menu", requireMerchant, saveMerchantMenu);

app.post("/api/merchant/menu/:itemId/hide", requireMerchant, async (req, res) => {
  try {
    const item = await supabase.updateMenuItem(req.user.storeId, req.params.itemId, {
      status: "hidden",
    });
    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/merchant/items/:itemId/archive", requireMerchant, async (req, res) => {
  try {
    const item = await supabase.updateMenuItem(req.user.storeId, req.params.itemId, {
      status: "hidden",
      archived: true,
    });
    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.patch("/api/merchant/items/:itemId", requireMerchant, async (req, res) => {
  try {
    const item = await supabase.updateMenuItem(req.user.storeId, req.params.itemId, req.body);
    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/merchant/orders", requireMerchant, async (req, res) => {
  try {
    const orders = await supabase.getMerchantOrders(req.user.storeId);
    return res.json({ ok: true, orders });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/merchant/orders/:requestId/status", requireMerchant, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await supabase.updateOrderStatus(req.user.storeId, req.params.requestId, status);
    if (!order) {
      return res.status(404).json({ ok: false, error: "Order not found" });
    }
    return res.json({ ok: true, order });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/merchant/analytics", requireMerchant, async (req, res) => {
  try {
    const items = await supabase.getMerchantItems(req.user.storeId);
    const orders = await supabase.getMerchantOrders(req.user.storeId);
    const analytics = buildMerchantAnalytics(orders, items);
    return res.json({ ok: true, analytics });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/merchant/profile", requireMerchant, async (req, res) => {
  try {
    const profile = await supabase.updateMerchantProfile(req.user.storeId, req.body);
    if (!profile) {
      return res.status(404).json({ ok: false, error: "Profile not found" });
    }
    return res.json({ ok: true, profile });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Stripe & Subscription endpoints
app.post("/api/billing/create-checkout-session", async (req, res) => {
  try {
    const { plan, storeId, email } = req.body;
    
    if (!plan || !storeId || !email) {
      return res.status(400).json({ ok: false, error: "plan, storeId, and email required" });
    }

    if (!stripe.hasStripe()) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.createCheckoutSession({
      plan,
      storeId,
      email,
      successUrl: `${origin}/merchant?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancelUrl: `${origin}/merchant-signup?canceled=true`,
    });

    return res.json({ ok: true, sessionId: session.sessionId, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/billing/create-portal-session", requireMerchant, async (req, res) => {
  try {
    const profile = await supabase.getStoreProfile(req.user.storeId);
    if (!profile || !profile.stripe_customer_id) {
      return res.status(404).json({ ok: false, error: "No billing information found" });
    }

    if (!stripe.hasStripe()) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.createBillingPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${origin}/merchant`,
    });

    return res.json({ ok: true, url: session.url });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/billing/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  if (!stripe.hasStripe()) {
    return res.status(503).send('Stripe not configured');
  }

  try {
    const event = await stripe.handleWebhookEvent(req.body, signature);
    
    console.log('Webhook event received:', event.type);

    // Handle subscription events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const storeId = session.metadata?.store_id;
        if (storeId && session.subscription) {
          await supabase.updateSubscriptionInfo(storeId, {
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const { storeId, updates } = stripe.processSubscriptionEvent(event);
        if (storeId) {
          await supabase.updateSubscriptionInfo(storeId, updates);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const storeId = subscription.metadata?.store_id;
        if (storeId) {
          await supabase.updateSubscriptionInfo(storeId, {
            subscription_status: 'canceled',
            plan: 'free',
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = invoice.subscription;
        if (subscription) {
          const sub = await stripe.getSubscription(subscription);
          const storeId = sub.metadata?.store_id;
          if (storeId) {
            await supabase.updateSubscriptionInfo(storeId, {
              subscription_status: 'past_due',
            });
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Public: Check Store ID availability
app.post("/api/public/check-store-id", async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ ok: false, error: "storeId required" });
    }

    const validation = supabase.validateStoreId(storeId);
    if (!validation.valid) {
      return res.json({ ok: true, available: false, error: validation.error });
    }

    const available = await supabase.checkStoreIdAvailable(storeId);
    return res.json({ ok: true, available });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Daily Specials endpoints (Pro+ feature)
app.get("/api/merchant/daily-specials", requireMerchant, async (req, res) => {
  try {
    const specials = await supabase.getDailySpecials(req.user.storeId);
    return res.json({ ok: true, specials });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/merchant/daily-specials", requireMerchant, async (req, res) => {
  try {
    // Check if merchant has Pro+ plan
    const profile = await supabase.getStoreProfile(req.user.storeId);
    if (!profile || !['pro', 'business'].includes(profile.plan)) {
      return res.status(403).json({ ok: false, error: "This feature requires Pro or Business plan" });
    }

    const special = await supabase.upsertDailySpecial(req.user.storeId, req.body);
    return res.json({ ok: true, special });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete("/api/merchant/daily-specials/:itemId", requireMerchant, async (req, res) => {
  try {
    await supabase.deleteDailySpecial(req.user.storeId, req.params.itemId);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Public: Get daily specials for a store
app.get("/api/public/store/:storeId/daily-specials", async (req, res) => {
  try {
    const specials = await supabase.getDailySpecials(req.params.storeId);
    return res.json({ ok: true, specials });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/media/upload", requireMerchant, upload.array("files", 5), async (req, res) => {
  try {
    const files = req.files || [];
    const imageFiles = files.filter((file) => file.mimetype?.startsWith("image/"));
    const videoFiles = files.filter((file) => file.mimetype?.startsWith("video/"));
    if (imageFiles.length > 1 || videoFiles.length > 1 || files.length > 2) {
      return res
        .status(400)
        .json({ ok: false, error: "Max one image and one video allowed per item." });
    }
    const urls = await supabase.uploadMedia({
      storeId: req.user.storeId,
      itemId: req.body.itemId,
      files,
    });
    return res.json({ ok: true, urls });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const envUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  if (!envUser || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: "Admin env vars not configured" });
  }
  if (username !== envUser || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  const token = signToken({ role: "admin" });
  return res.json({ ok: true, token });
});

app.get("/api/admin/stores", requireAdmin, async (req, res) => {
  try {
    const result = await supabase.getAdminStores({
      q: req.query.q,
      status: req.query.status,
      parish: req.query.parish,
      cuisine: req.query.cuisine,
      limit: req.query.limit,
      offset: req.query.offset,
      sort: req.query.sort,
    });
    return res.json({ ok: true, stores: result.stores, total: result.total });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/admin/stores/:storeId", requireAdmin, async (req, res) => {
  try {
    const store = await supabase.getAdminStoreDetail(req.params.storeId);
    if (!store) {
      return res.status(404).json({ ok: false, error: "Store not found" });
    }
    const menuItems = await supabase.getAdminMenuItems({ storeId: req.params.storeId, limit: 10 });
    const orders = await supabase.getAdminOrders({ storeId: req.params.storeId, limit: 10 });
    const analyticsOrders = await supabase.getMerchantOrders(req.params.storeId);
    const analyticsItems = await supabase.getMerchantItems(req.params.storeId);
    const analytics = buildMerchantAnalytics(analyticsOrders, analyticsItems);
    return res.json({
      ok: true,
      store,
      menuItems: menuItems.items || menuItems,
      orders: orders.orders || orders,
      analytics,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.patch("/api/admin/stores/:storeId", requireAdmin, async (req, res) => {
  try {
    const updated = await supabase.updateMerchantProfile(req.params.storeId, req.body);
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Store not found" });
    }
    return res.json({ ok: true, store: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/admin/stores", requireAdmin, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.store_id || !payload.name) {
      return res.status(400).json({ ok: false, error: "store_id and name required" });
    }
    const store = await supabase.createStore(payload);
    return res.json({ ok: true, store });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/admin/stores/bulk-update", requireAdmin, async (req, res) => {
  try {
    const { store_ids: storeIds, action } = req.body;
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({ ok: false, error: "store_ids required" });
    }
    if (!["pause", "activate"].includes(action)) {
      return res.status(400).json({ ok: false, error: "action must be pause or activate" });
    }
    const updated = await supabase.bulkUpdateStores(storeIds, action);
    return res.json({ ok: true, stores: updated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/admin/stores/bulk-reset-passcodes", requireAdmin, async (req, res) => {
  try {
    const { store_ids: storeIds } = req.body;
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({ ok: false, error: "store_ids required" });
    }
    const resets = await supabase.bulkResetPasscodes(storeIds);
    return res.json({ ok: true, resets });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

const resetAdminPasscode = async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ ok: false, error: "storeId required" });
    }
    const result = await supabase.resetPassword(storeId);
    if (!result) {
      return res.status(404).json({ ok: false, error: "Store not found" });
    }
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

app.post("/api/admin/reset-password", requireAdmin, resetAdminPasscode);
app.post("/api/admin/reset-passcode", requireAdmin, resetAdminPasscode);

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const result = await supabase.getAdminOrders({
      storeId: req.query.storeId,
      q: req.query.q,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
      from: req.query.from,
      to: req.query.to,
    });
    return res.json({
      ok: true,
      orders: result.orders || result,
      total: result.total ?? result.length,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/admin/orders/:requestId/status", requireAdmin, async (req, res) => {
  try {
    if (!req.body.status) {
      return res.status(400).json({ ok: false, error: "status required" });
    }
    const order = await supabase.updateOrderStatusAdmin(req.params.requestId, req.body.status);
    if (!order) {
      return res.status(404).json({ ok: false, error: "Order not found" });
    }
    return res.json({ ok: true, order });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/admin/menu-items", requireAdmin, async (req, res) => {
  try {
    const result = await supabase.getAdminMenuItems({
      storeId: req.query.storeId,
      q: req.query.q,
      category: req.query.category,
      status: req.query.status,
      featured: req.query.featured,
      missingMedia: req.query.missingMedia === "true",
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ ok: true, items: result.items, total: result.total });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/admin/menu", requireAdmin, async (req, res) => {
  try {
    const result = await supabase.getAdminMenuItems({
      storeId: req.query.storeId,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ ok: true, items: result.items, total: result.total });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.patch("/api/admin/menu-items/:itemId", requireAdmin, async (req, res) => {
  try {
    const { store_id: storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ ok: false, error: "store_id required" });
    }
    const item = await supabase.updateMenuItem(storeId, req.params.itemId, req.body);
    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/admin/menu/:itemId", requireAdmin, async (req, res) => {
  try {
    const { store_id: storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ ok: false, error: "store_id required" });
    }
    const item = await supabase.updateMenuItem(storeId, req.params.itemId, req.body);
    if (!item) {
      return res.status(404).json({ ok: false, error: "Item not found" });
    }
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  try {
    const analytics = await supabase.getAdminAnalytics();
    return res.json({ ok: true, analytics });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

const sendAdminSummary = async (req, res) => {
  try {
    const summary = await supabase.getSummary(req.query.month);
    return res.json({ ok: true, summary });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

app.get("/api/admin/summary", requireAdmin, sendAdminSummary);
app.get("/api/admin/stores/summary", requireAdmin, sendAdminSummary);

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "API route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  console.error("Unhandled error", error);
  const status = error.status || error.statusCode || 500;
  const message =
    error.type === "entity.parse.failed"
      ? "Invalid JSON payload"
      : error.message || "Server error";
  return res.status(status).json({ ok: false, error: message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`ClickMenu server running on ${PORT}`);
  if (!process.env.JWT_SECRET) {
    console.error(
      "JWT_SECRET is not set. Provide a strong JWT_SECRET in Cloud Run environment variables."
    );
  }
  if (!supabase.hasSupabase()) {
    console.warn("Supabase credentials missing. Running in mock mode.");
  }
});
