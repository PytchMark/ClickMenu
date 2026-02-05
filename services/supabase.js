const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { summarizeOrders } = require("./analytics");
const { uploadFiles } = require("./cloudinary");

const hasSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = hasSupabase()
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

const mockState = {
  profiles: [
    {
      id: crypto.randomUUID(),
      store_id: "TACOS01",
      name: "Luna Tacos",
      status: "active",
      whatsapp: "+15551234567",
      profile_email: "hello@lunatacos.example",
      password: "tacos123",
      logo_url: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=160&q=80",
      business_address: "12 Duke Street",
      parish: "Kingston",
      owner_name: "Luna Santos",
      owner_phone: "+15551230000",
      owner_email: "owner@lunatacos.example",
      cuisine_type: "Modern Mexican",
      hours: "Mon-Sat 11am-9pm",
      about: "Birria-inspired tacos with a smoky twist.",
      instagram: "@lunatacos",
      tiktok: "@lunatacos",
      pickup_enabled: true,
      delivery_enabled: true,
      authorized: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  menu_items: [
    {
      id: crypto.randomUUID(),
      store_id: "TACOS01",
      item_id: "FOOD-001",
      title: "Birria Taco Trio",
      description: "Slow-braised beef, consommé, pickled onion, cilantro.",
      category: "Lunch",
      price: 14,
      status: "available",
      featured: true,
      labels: ["Top Pick"],
      image_url: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
      video_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      store_id: "TACOS01",
      item_id: "FOOD-002",
      title: "Citrus Shrimp Bowl",
      description: "Charred corn, avocado crema, lime zest.",
      category: "Bowls",
      price: 12,
      status: "available",
      featured: false,
      labels: ["Most Loved"],
      image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
      video_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  order_requests: [
    {
      id: crypto.randomUUID(),
      request_id: "ORD-DEMO-0001",
      store_id: "TACOS01",
      status: "new",
      customer_name: "Ava Morales",
      customer_phone: "+15550001111",
      customer_email: "ava@example.com",
      notes: "Extra lime please",
      items_json: [
        { itemId: "FOOD-001", title: "Birria Taco Trio", qty: 1, price: 14 },
      ],
      fulfillment_type: "pickup",
      parish: "Kingston",
      delivery_address: "Pickup counter",
      delivery_notes: null,
      preferred_time: null,
      subtotal: 14,
      source: "storefront",
      created_at: new Date().toISOString(),
    },
  ],
};

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildOrderId = () => `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const normalizeMenuItem = (item) => ({
  ...item,
  featured: item.featured ?? item.is_featured ?? false,
  labels: item.labels || [],
});

const startOfDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const profileCompleteness = (store) => {
  const fields = [
    store.name,
    store.logo_url,
    store.whatsapp,
    store.profile_email,
    store.business_address,
    store.parish,
    store.hours,
    store.about,
  ];
  const filled = fields.filter((value) => value && String(value).trim()).length;
  return Math.round((filled / fields.length) * 100);
};

const buildStoreMetrics = (stores, orders = []) => {
  const todayStart = startOfDay();
  const weekStart = daysAgo(7);
  const grouped = stores.reduce((acc, store) => {
    acc[store.store_id] = {
      orders_today: 0,
      orders_7d: 0,
      last_active: store.updated_at || store.created_at || null,
    };
    return acc;
  }, {});

  orders.forEach((order) => {
    const created = new Date(order.created_at);
    const entry = grouped[order.store_id];
    if (!entry) return;
    if (created >= weekStart) {
      entry.orders_7d += 1;
    }
    if (created >= todayStart) {
      entry.orders_today += 1;
    }
    if (!entry.last_active || created > new Date(entry.last_active)) {
      entry.last_active = order.created_at;
    }
  });

  return grouped;
};

const getStoreProfile = async (storeId) => {
  if (!hasSupabase()) {
    return mockState.profiles.find((profile) => profile.store_id === storeId) || null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "store_id,name,status,whatsapp,logo_url,profile_email,cuisine_type,business_address,parish,owner_name,owner_phone,owner_email,hours,about,instagram,tiktok,pickup_enabled,delivery_enabled,authorized"
    )
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const getMenuItems = async (storeId, includeAll = false) => {
  if (!hasSupabase()) {
    return mockState.menu_items.filter((item) => {
      if (item.store_id !== storeId) return false;
      if (includeAll) return true;
      return item.status === "available" || item.status === "limited";
    });
  }
  let query = supabase.from("menu_items").select("*").eq("store_id", storeId);
  if (!includeAll) {
    query = query.in("status", ["available", "limited"]);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeMenuItem);
};

const getCombinedMenu = async (storeIds) => {
  const uniqueIds = Array.from(new Set(storeIds.filter(Boolean))).slice(0, 3);
  if (!hasSupabase()) {
    const stores = mockState.profiles.filter(
      (profile) =>
        uniqueIds.includes(profile.store_id) &&
        profile.status === "active" &&
        profile.authorized
    );
    const activeStoreIds = stores.map((store) => store.store_id);
    const items = mockState.menu_items.filter(
      (item) =>
        activeStoreIds.includes(item.store_id) &&
        ["available", "limited"].includes(item.status)
    );
    return { stores, items: items.map(normalizeMenuItem) };
  }
  const { data: stores, error: storesError } = await supabase
    .from("profiles")
    .select("store_id,name,status,whatsapp,logo_url,about,hours,authorized")
    .in("store_id", uniqueIds);
  if (storesError) throw storesError;
  const activeStoreIds = (stores || [])
    .filter((store) => store.status === "active" && store.authorized)
    .map((store) => store.store_id);
  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("*")
    .in("store_id", activeStoreIds)
    .in("status", ["available", "limited"]);
  if (itemsError) throw itemsError;
  const activeStores = (stores || []).filter(
    (store) => store.status === "active" && store.authorized
  );
  return { stores: activeStores, items: (items || []).map(normalizeMenuItem) };
};

const createOrderRequest = async (storeId, payload) => {
  const order = {
    id: crypto.randomUUID(),
    request_id: buildOrderId(),
    store_id: storeId,
    status: "new",
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    customer_email: payload.customer_email || null,
    notes: payload.notes || null,
    items_json: payload.items_json || [],
    fulfillment_type: payload.fulfillment_type || "pickup",
    parish: payload.parish || null,
    delivery_address: payload.delivery_address || null,
    delivery_notes: payload.delivery_notes || null,
    preferred_time: payload.preferred_time || null,
    subtotal: payload.subtotal || null,
    source: payload.source || "storefront",
    created_at: new Date().toISOString(),
  };

  if (!hasSupabase()) {
    mockState.order_requests.unshift(order);
    return order;
  }
  const { data, error } = await supabase
    .from("order_requests")
    .insert(order)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const merchantLogin = async ({ identifier, storeIdOrEmail, passcode, password }) => {
  const lookup = identifier || storeIdOrEmail;
  const credential = passcode || password;
  if (!lookup || !credential) return null;
  const isEmail = lookup.includes("@");
  if (!hasSupabase()) {
    const profile = mockState.profiles.find((item) =>
      isEmail ? item.profile_email === lookup : item.store_id === lookup
    );
    if (!profile || profile.password !== credential || profile.status !== "active") {
      return null;
    }
    return profile;
  }
  const query = supabase.from("profiles").select("*");
  const { data, error } = isEmail
    ? await query.eq("profile_email", lookup).maybeSingle()
    : await query.eq("store_id", lookup).maybeSingle();
  if (error) throw error;
  if (!data || data.password !== credential || data.status !== "active") {
    return null;
  }
  return data;
};

const getMerchantItems = async (storeId) => {
  if (!hasSupabase()) {
    return mockState.menu_items.filter((item) => item.store_id === storeId);
  }
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeMenuItem);
};

const upsertMenuItem = async (storeId, payload) => {
  const labels = Array.isArray(payload.labels)
    ? payload.labels
    : payload.labels
      ? [payload.labels]
      : [];
  const record = {
    store_id: storeId,
    item_id: payload.item_id,
    title: payload.title,
    description: payload.description || null,
    category: payload.category || null,
    price: payload.price ?? null,
    status: payload.status || "available",
    featured: payload.featured || false,
    labels,
    image_url: payload.image_url || null,
    video_url: payload.video_url || null,
    archived: payload.archived ?? false,
    updated_at: new Date().toISOString(),
  };

  if (!hasSupabase()) {
    const existingIndex = mockState.menu_items.findIndex(
      (item) => item.store_id === storeId && item.item_id === payload.item_id
    );
    if (existingIndex >= 0) {
      mockState.menu_items[existingIndex] = {
        ...mockState.menu_items[existingIndex],
        ...record,
      };
      return mockState.menu_items[existingIndex];
    }
    const newItem = {
      ...record,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    mockState.menu_items.unshift(newItem);
    return newItem;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .upsert(record, { onConflict: "store_id,item_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const updateMenuItem = async (storeId, itemId, payload) => {
  if (!hasSupabase()) {
    const existingIndex = mockState.menu_items.findIndex(
      (item) => item.store_id === storeId && item.item_id === itemId
    );
    if (existingIndex < 0) return null;
    mockState.menu_items[existingIndex] = {
      ...mockState.menu_items[existingIndex],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    return mockState.menu_items[existingIndex];
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("item_id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const getMerchantOrders = async (storeId) => {
  if (!hasSupabase()) {
    return mockState.order_requests.filter((order) => order.store_id === storeId);
  }
  const { data, error } = await supabase
    .from("order_requests")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

const updateOrderStatus = async (storeId, requestId, status) => {
  if (!hasSupabase()) {
    const existing = mockState.order_requests.find(
      (order) => order.store_id === storeId && order.request_id === requestId
    );
    if (!existing) return null;
    existing.status = status;
    return existing;
  }
  const { data, error } = await supabase
    .from("order_requests")
    .update({ status })
    .eq("store_id", storeId)
    .eq("request_id", requestId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const getAdminStores = async ({
  q,
  status,
  parish,
  cuisine,
  limit = 25,
  offset = 0,
  sort = "newest",
} = {}) => {
  const safeLimit = clamp(parseNumber(limit, 25), 1, 100);
  const safeOffset = Math.max(0, parseNumber(offset, 0));

  if (!hasSupabase()) {
    let stores = [...mockState.profiles];
    if (q) {
      const needle = q.toLowerCase();
      stores = stores.filter(
        (store) =>
          store.store_id.toLowerCase().includes(needle) ||
          store.name.toLowerCase().includes(needle) ||
          (store.profile_email || "").toLowerCase().includes(needle) ||
          (store.whatsapp || "").toLowerCase().includes(needle)
      );
    }
    if (status) {
      stores = stores.filter((store) => store.status === status);
    }
    if (parish) {
      stores = stores.filter((store) => (store.parish || "").includes(parish));
    }
    if (cuisine) {
      const matching = new Set(
        mockState.menu_items
          .filter((item) => (item.category || "").toLowerCase().includes(cuisine.toLowerCase()))
          .map((item) => item.store_id)
      );
      stores = stores.filter((store) => matching.has(store.store_id));
    }
    if (sort === "orders") {
      const counts = mockState.order_requests.reduce((acc, order) => {
        acc[order.store_id] = (acc[order.store_id] || 0) + 1;
        return acc;
      }, {});
      stores.sort((a, b) => (counts[b.store_id] || 0) - (counts[a.store_id] || 0));
    } else {
      stores.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const total = stores.length;
    const paged = stores.slice(safeOffset, safeOffset + safeLimit);
    const metrics = buildStoreMetrics(paged, mockState.order_requests);
    return {
      stores: paged.map((store) => ({
        ...store,
        profile_completeness: profileCompleteness(store),
        ...metrics[store.store_id],
      })),
      total,
    };
  }

  let query = supabase.from("profiles").select("*", { count: "exact" });
  if (q) {
    query = query.or(
      `store_id.ilike.%${q}%,name.ilike.%${q}%,profile_email.ilike.%${q}%,whatsapp.ilike.%${q}%`
    );
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (parish) {
    query = query.ilike("parish", `%${parish}%`);
  }
  if (cuisine) {
    const { data: cuisineMatches, error: cuisineError } = await supabase
      .from("menu_items")
      .select("store_id")
      .ilike("category", `%${cuisine}%`);
    if (cuisineError) throw cuisineError;
    const storeIds = Array.from(new Set((cuisineMatches || []).map((item) => item.store_id)));
    query = query.in("store_id", storeIds.length ? storeIds : [""]);
  }

  if (sort === "orders") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(
    safeOffset,
    safeOffset + safeLimit - 1
  );
  if (error) throw error;
  const stores = data || [];
  const storeIds = stores.map((store) => store.store_id);
  let orders = [];
  if (storeIds.length) {
    const { data: orderData, error: orderError } = await supabase
      .from("order_requests")
      .select("store_id,created_at")
      .in("store_id", storeIds)
      .gte("created_at", daysAgo(7).toISOString());
    if (orderError) throw orderError;
    orders = orderData || [];
  }
  const metrics = buildStoreMetrics(stores, orders);
  const enriched = stores.map((store) => ({
      ...store,
      profile_completeness: profileCompleteness(store),
      ...metrics[store.store_id],
    }));
  if (sort === "orders") {
    enriched.sort((a, b) => (b.orders_7d || 0) - (a.orders_7d || 0));
  }
  return { stores: enriched, total: count || 0 };
};

const createStore = async (payload) => {
  const record = {
    store_id: payload.store_id,
    name: payload.name,
    status: payload.status || "active",
    whatsapp: payload.whatsapp || null,
    profile_email: payload.profile_email || null,
    cuisine_type: payload.cuisine_type || null,
    password: payload.password || crypto.randomBytes(4).toString("hex"),
    logo_url: payload.logo_url || null,
    business_address: payload.business_address || null,
    parish: payload.parish || null,
    owner_name: payload.owner_name || null,
    owner_phone: payload.owner_phone || null,
    owner_email: payload.owner_email || null,
    hours: payload.hours || null,
    about: payload.about || null,
    instagram: payload.instagram || null,
    tiktok: payload.tiktok || null,
    pickup_enabled: payload.pickup_enabled ?? true,
    delivery_enabled: payload.delivery_enabled ?? true,
    authorized: payload.authorized ?? false,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (!hasSupabase()) {
    const existingIndex = mockState.profiles.findIndex(
      (profile) => profile.store_id === payload.store_id
    );
    if (existingIndex >= 0) {
      mockState.profiles[existingIndex] = { ...mockState.profiles[existingIndex], ...record };
      return mockState.profiles[existingIndex];
    }
    mockState.profiles.unshift({ id: crypto.randomUUID(), ...record });
    return record;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(record, { onConflict: "store_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const resetPassword = async (storeId) => {
  const newPassword = crypto.randomBytes(4).toString("hex");
  if (!hasSupabase()) {
    const profile = mockState.profiles.find((item) => item.store_id === storeId);
    if (!profile) return null;
    profile.password = newPassword;
    return { store_id: storeId, password: newPassword };
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({ password: newPassword })
    .eq("store_id", storeId)
    .select("store_id,password")
    .single();
  if (error) throw error;
  return data;
};

const getAdminOrders = async ({
  storeId,
  q,
  status,
  limit = 25,
  offset = 0,
  from,
  to,
} = {}) => {
  const safeLimit = clamp(parseNumber(limit, 25), 1, 100);
  const safeOffset = Math.max(0, parseNumber(offset, 0));

  if (!hasSupabase()) {
    let orders = storeId
      ? mockState.order_requests.filter((order) => order.store_id === storeId)
      : [...mockState.order_requests];
    if (q) {
      const needle = q.toLowerCase();
      orders = orders.filter(
        (order) =>
          order.request_id.toLowerCase().includes(needle) ||
          order.store_id.toLowerCase().includes(needle) ||
          (order.customer_name || "").toLowerCase().includes(needle) ||
          (order.customer_phone || "").toLowerCase().includes(needle)
      );
    }
    if (status) {
      orders = orders.filter((order) => order.status === status);
    }
    if (from) {
      orders = orders.filter((order) => new Date(order.created_at) >= new Date(from));
    }
    if (to) {
      orders = orders.filter((order) => new Date(order.created_at) <= new Date(to));
    }
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = orders.length;
    const storeWhatsapps = mockState.profiles.reduce((acc, profile) => {
      acc[profile.store_id] = profile.whatsapp || null;
      return acc;
    }, {});
    return {
      orders: orders.slice(safeOffset, safeOffset + safeLimit).map((order) => ({
        ...order,
        store_whatsapp: storeWhatsapps[order.store_id] || null,
      })),
      total,
    };
  }

  let query = supabase.from("order_requests").select("*", { count: "exact" });
  if (storeId) {
    query = query.eq("store_id", storeId);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }
  if (q) {
    query = query.or(
      `request_id.ilike.%${q}%,store_id.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`
    );
  }
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  const orders = data || [];
  let storeWhatsapps = {};
  const storeIds = Array.from(new Set(orders.map((order) => order.store_id)));
  if (storeIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("store_id,whatsapp")
      .in("store_id", storeIds);
    if (profileError) throw profileError;
    storeWhatsapps = (profiles || []).reduce((acc, profile) => {
      acc[profile.store_id] = profile.whatsapp || null;
      return acc;
    }, {});
  }
  return {
    orders: orders.map((order) => ({
      ...order,
      store_whatsapp: storeWhatsapps[order.store_id] || null,
    })),
    total: count || 0,
  };
};

const getSummary = async () => {
  const ordersData = await getAdminOrders({ limit: 500, offset: 0 });
  const storesData = await getAdminStores({ limit: 500, offset: 0 });
  const summary = summarizeOrders(ordersData.orders || ordersData);
  return {
    ...summary,
    totalStores: (storesData.stores || storesData).length,
  };
};

const getAdminMenuItems = async ({
  storeId,
  q,
  category,
  status,
  featured,
  missingMedia,
  limit = 25,
  offset = 0,
} = {}) => {
  const safeLimit = clamp(parseNumber(limit, 25), 1, 100);
  const safeOffset = Math.max(0, parseNumber(offset, 0));

  const needsMedia = missingMedia === true || missingMedia === "true";
  const featuredFlag = featured === true || featured === "true";

  if (!hasSupabase()) {
    let items = storeId
      ? mockState.menu_items.filter((item) => item.store_id === storeId)
      : [...mockState.menu_items];
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (item) =>
          item.item_id.toLowerCase().includes(needle) ||
          item.title.toLowerCase().includes(needle) ||
          item.store_id.toLowerCase().includes(needle)
      );
    }
    if (category) {
      items = items.filter((item) => (item.category || "").includes(category));
    }
    if (status) {
      items = items.filter((item) => item.status === status);
    }
    if (featured !== undefined && featured !== null && featured !== "") {
      items = items.filter((item) => Boolean(item.featured) === featuredFlag);
    }
    if (needsMedia) {
      items = items.filter((item) => !item.image_url && !item.video_url);
    }
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = items.length;
    return {
      items: items.slice(safeOffset, safeOffset + safeLimit).map(normalizeMenuItem),
      total,
    };
  }

  let query = supabase.from("menu_items").select("*", { count: "exact" });
  if (storeId) {
    query = query.eq("store_id", storeId);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (category) {
    query = query.ilike("category", `%${category}%`);
  }
  if (featured !== undefined && featured !== null && featured !== "") {
    query = query.eq("featured", featuredFlag);
  }
  if (needsMedia) {
    query = query.is("image_url", null).is("video_url", null);
  }
  if (q) {
    query = query.or(
      `item_id.ilike.%${q}%,title.ilike.%${q}%,store_id.ilike.%${q}%`
    );
  }
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return { items: (data || []).map(normalizeMenuItem), total: count || 0 };
};

const getAdminMenu = async (storeId) =>
  getAdminMenuItems({ storeId }).then((result) => result.items);

const updateOrderStatusAdmin = async (requestId, status) => {
  if (!hasSupabase()) {
    const existing = mockState.order_requests.find((order) => order.request_id === requestId);
    if (!existing) return null;
    existing.status = status;
    return existing;
  }
  const { data, error } = await supabase
    .from("order_requests")
    .update({ status })
    .eq("request_id", requestId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const updateMerchantProfile = async (storeId, payload) => {
  if (!hasSupabase()) {
    const index = mockState.profiles.findIndex((profile) => profile.store_id === storeId);
    if (index < 0) return null;
    mockState.profiles[index] = { ...mockState.profiles[index], ...payload };
    return mockState.profiles[index];
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const getAdminStoreDetail = async (storeId) => {
  if (!hasSupabase()) {
    return mockState.profiles.find((profile) => profile.store_id === storeId) || null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const bulkUpdateStores = async (storeIds, action) => {
  const nextStatus = action === "pause" ? "paused" : "active";
  if (!hasSupabase()) {
    mockState.profiles = mockState.profiles.map((profile) =>
      storeIds.includes(profile.store_id) ? { ...profile, status: nextStatus } : profile
    );
    return mockState.profiles.filter((profile) => storeIds.includes(profile.store_id));
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .in("store_id", storeIds)
    .select("*");
  if (error) throw error;
  return data || [];
};

const bulkResetPasscodes = async (storeIds) => {
  if (!hasSupabase()) {
    return storeIds
      .map((storeId) => {
        const profile = mockState.profiles.find((item) => item.store_id === storeId);
        if (!profile) return null;
        const newPassword = crypto.randomBytes(4).toString("hex");
        profile.password = newPassword;
        return { store_id: storeId, password: newPassword };
      })
      .filter(Boolean);
  }
  const resets = await Promise.all(
    storeIds.map(async (storeId) => {
      const newPassword = crypto.randomBytes(4).toString("hex");
      const { data, error } = await supabase
        .from("profiles")
        .update({ password: newPassword })
        .eq("store_id", storeId)
        .select("store_id,password")
        .single();
      if (error) throw error;
      return data;
    })
  );
  return resets;
};

const getAdminAnalytics = async () => {
  const storesData = await getAdminStores({ limit: 500, offset: 0 });
  const ordersData = await getAdminOrders({ limit: 500, offset: 0 });
  const stores = storesData.stores || storesData;
  const orders = ordersData.orders || ordersData;

  const orderCounts = orders.reduce((acc, order) => {
    acc[order.store_id] = (acc[order.store_id] || 0) + 1;
    return acc;
  }, {});

  const weekStart = daysAgo(7);
  const sevenDayOrders = orders.filter((order) => new Date(order.created_at) >= weekStart);
  const sevenDayCounts = sevenDayOrders.reduce((acc, order) => {
    acc[order.store_id] = (acc[order.store_id] || 0) + 1;
    return acc;
  }, {});

  const topMerchants = stores
    .map((store) => ({
      store_id: store.store_id,
      name: store.name,
      total_orders: sevenDayCounts[store.store_id] || 0,
    }))
    .sort((a, b) => b.total_orders - a.total_orders)
    .slice(0, 5);

  const itemCounts = {};
  orders.forEach((order) => {
    (order.items_json || []).forEach((item) => {
      const id = item.itemId || item.item_id;
      if (!id) return;
      itemCounts[id] = itemCounts[id] || { item_id: id, title: item.title || "Item", total_requests: 0 };
      itemCounts[id].total_requests += item.qty || 1;
    });
  });
  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.total_requests - a.total_requests)
    .slice(0, 5);

  const deadMerchants = stores
    .map((store) => {
      const lastOrder = orders
        .filter((order) => order.store_id === store.store_id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const fallbackDate = store.updated_at || store.created_at || new Date().toISOString();
      const lastActive = lastOrder ? new Date(lastOrder.created_at) : new Date(fallbackDate);
      const diffDays = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      return { store_id: store.store_id, name: store.name, days: diffDays };
    })
    .filter((entry) => entry.days >= 30)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  return { totals: orderCounts, topMerchants, topItems, deadMerchants };
};

const uploadMedia = async ({ storeId, itemId, files }) =>
  uploadFiles({ storeId, itemId, files });

// Subscription management functions
const updateSubscriptionInfo = async (storeId, updates) => {
  if (!hasSupabase()) {
    const index = mockState.profiles.findIndex((profile) => profile.store_id === storeId);
    if (index < 0) return null;
    mockState.profiles[index] = { ...mockState.profiles[index], ...updates };
    return mockState.profiles[index];
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const getDailySpecials = async (storeId) => {
  if (!hasSupabase()) {
    // Mock: return empty for now
    return [];
  }
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from("daily_specials")
    .select("*")
    .eq("store_id", storeId)
    .eq("display_date", today)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

const upsertDailySpecial = async (storeId, payload) => {
  if (!hasSupabase()) {
    return { id: crypto.randomUUID(), store_id: storeId, ...payload };
  }
  const today = new Date().toISOString().split('T')[0];
  const record = {
    store_id: storeId,
    item_id: payload.item_id,
    title: payload.title,
    description: payload.description || null,
    price: payload.price,
    image_url: payload.image_url || null,
    active: payload.active ?? true,
    display_date: today,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("daily_specials")
    .upsert(record, { onConflict: "store_id,item_id,display_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

const deleteDailySpecial = async (storeId, itemId) => {
  if (!hasSupabase()) {
    return { success: true };
  }
  const { error } = await supabase
    .from("daily_specials")
    .delete()
    .eq("store_id", storeId)
    .eq("item_id", itemId);
  if (error) throw error;
  return { success: true };
};

const validateStoreId = (storeId) => {
  // Must be max 6 characters, start with capital letter, contain at least one number
  const regex = /^[A-Z][A-Z0-9]{0,5}$/;
  if (!regex.test(storeId)) {
    return {
      valid: false,
      error: 'Store ID must start with a capital letter, be max 6 characters, and contain at least one number'
    };
  }
  // Check if contains at least one number
  if (!/\d/.test(storeId)) {
    return {
      valid: false,
      error: 'Store ID must contain at least one number'
    };
  }
  return { valid: true };
};

const checkStoreIdAvailable = async (storeId) => {
  if (!hasSupabase()) {
    const exists = mockState.profiles.some(p => p.store_id === storeId);
    return !exists;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return !data; // Available if no data found
};

module.exports = {
  hasSupabase,
  getStoreProfile,
  getMenuItems,
  getCombinedMenu,
  createOrderRequest,
  merchantLogin,
  getMerchantItems,
  upsertMenuItem,
  updateMenuItem,
  getMerchantOrders,
  updateOrderStatus,
  getAdminStores,
  createStore,
  resetPassword,
  getAdminOrders,
  getSummary,
  getAdminMenu,
  getAdminMenuItems,
  updateOrderStatusAdmin,
  updateMerchantProfile,
  getAdminStoreDetail,
  bulkUpdateStores,
  bulkResetPasscodes,
  getAdminAnalytics,
  uploadMedia,
  updateSubscriptionInfo,
  getDailySpecials,
  upsertDailySpecial,
  deleteDailySpecial,
  validateStoreId,
  checkStoreIdAvailable,
};
