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

const app = express();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["*"];

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
app.get("/admin", sendApp("admin"));

app.get("/", (req, res) => res.redirect("/storefront"));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mockMode: !supabase.hasSupabase(),
  });
});

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
    const { storeIdOrEmail, password } = req.body;
    if (!storeIdOrEmail || !password) {
      return res.status(400).json({ ok: false, error: "Missing credentials" });
    }
    const profile = await supabase.merchantLogin({ storeIdOrEmail, password });
    if (!profile) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    const token = signToken({ role: "merchant", storeId: profile.store_id });
    return res.json({ ok: true, token, profile });
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
    if (!payload.item_id || !payload.title || !payload.category) {
      return res
        .status(400)
        .json({ ok: false, error: "item_id, title, category required" });
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
    const urls = await supabase.uploadMedia({
      storeId: req.user.storeId,
      itemId: req.body.itemId,
      files: req.files,
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
    const stores = await supabase.getAdminStores();
    return res.json({ ok: true, stores });
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
    const orders = await supabase.getAdminOrders(req.query.storeId);
    const filtered = req.query.status
      ? orders.filter((order) => order.status === req.query.status)
      : orders;
    return res.json({ ok: true, orders: filtered });
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`ClickMenu server running on ${PORT}`);
  if (!process.env.JWT_SECRET) {
    console.error(
      "JWT_SECRET is not set. Provide a strong JWT_SECRET in Cloud Run environment variables."
    );
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
  if (!supabase.hasSupabase()) {
    console.warn("Supabase credentials missing. Running in mock mode.");
  }
});
