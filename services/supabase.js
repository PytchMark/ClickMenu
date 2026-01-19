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
      hours: "Mon-Sat 11am-9pm",
      about: "Birria-inspired tacos with a smoky twist.",
      instagram: "@lunatacos",
      tiktok: "@lunatacos",
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

const buildOrderId = () => `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const normalizeMenuItem = (item) => ({
  ...item,
  featured: item.featured ?? item.is_featured ?? false,
  labels: item.labels || [],
});

const getStoreProfile = async (storeId) => {
  if (!hasSupabase()) {
    return mockState.profiles.find((profile) => profile.store_id === storeId) || null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "store_id,name,status,whatsapp,logo_url,profile_email,business_address,parish,owner_name,owner_phone,owner_email,hours,about,instagram,tiktok,authorized"
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

const merchantLogin = async ({ storeIdOrEmail, password }) => {
  if (!hasSupabase()) {
    const profile = mockState.profiles.find(
      (item) =>
        item.store_id === storeIdOrEmail || item.profile_email === storeIdOrEmail
    );
    if (!profile || profile.password !== password || profile.status === "paused") {
      return null;
    }
    return profile;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`store_id.eq.${storeIdOrEmail},profile_email.eq.${storeIdOrEmail}`)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.password !== password || data.status === "paused") {
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

const getAdminStores = async () => {
  if (!hasSupabase()) {
    return mockState.profiles;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

const createStore = async (payload) => {
  const record = {
    store_id: payload.store_id,
    name: payload.name,
    status: payload.status || "active",
    whatsapp: payload.whatsapp || null,
    profile_email: payload.profile_email || null,
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

const getAdminOrders = async (storeId) => {
  if (!hasSupabase()) {
    return storeId
      ? mockState.order_requests.filter((order) => order.store_id === storeId)
      : mockState.order_requests;
  }
  let query = supabase.from("order_requests").select("*").order("created_at", { ascending: false });
  if (storeId) {
    query = query.eq("store_id", storeId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const getSummary = async () => {
  const orders = await getAdminOrders();
  const stores = await getAdminStores();
  const summary = summarizeOrders(orders);
  return {
    ...summary,
    totalStores: stores.length,
  };
};

const getAdminMenu = async (storeId) => {
  if (!hasSupabase()) {
    return storeId
      ? mockState.menu_items.filter((item) => item.store_id === storeId)
      : mockState.menu_items;
  }
  let query = supabase.from("menu_items").select("*").order("created_at", { ascending: false });
  if (storeId) {
    query = query.eq("store_id", storeId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeMenuItem);
};

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

const uploadMedia = async ({ storeId, itemId, files }) =>
  uploadFiles({ storeId, itemId, files });

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
  updateOrderStatusAdmin,
  updateMerchantProfile,
  uploadMedia,
};
