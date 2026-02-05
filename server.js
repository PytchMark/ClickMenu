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

app.use(helmet({ crossOriginResourcePolicy: false }));
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
