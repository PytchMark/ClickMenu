const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginError = document.getElementById("loginError");
const storeName = document.getElementById("storeName");
const storeStatus = document.getElementById("storeStatus");
const storeLogo = document.getElementById("storeLogo");
const kpiRow = document.getElementById("kpiRow");
const attentionList = document.getElementById("attentionList");
const storefrontPreview = document.getElementById("storefrontPreview");
const ordersPulse = document.getElementById("ordersPulse");

const dashboardPanel = document.getElementById("dashboardPanel");
const menuPanel = document.getElementById("menuPanel");
const ordersPanel = document.getElementById("ordersPanel");
const profilePanel = document.getElementById("profilePanel");

const menuCount = document.getElementById("menuCount");
const itemsList = document.getElementById("itemsList");
const ordersList = document.getElementById("ordersList");
const newOrdersCount = document.getElementById("newOrdersCount");
const menuSort = document.getElementById("menuSort");

const mediaPreview = document.getElementById("mediaPreview");
const profilePreview = document.getElementById("profilePreview");
const completionValue = document.getElementById("completionValue");
const completionBar = document.getElementById("completionBar");

const state = {
  profile: null,
  items: [],
  orders: [],
  analytics: null,
  requestCounts: {},
};

menuSort.dataset.auto = "true";

const isAuthError = (error) =>
  error && ["Invalid token", "Missing token", "Forbidden"].includes(error.message);

const resetToLogin = () => {
  localStorage.removeItem("merchant_token");
  loginView.hidden = false;
  dashboardView.hidden = true;
};

const handleAuthError = (error) => {
  if (isAuthError(error)) {
    resetToLogin();
    return true;
  }
  return false;
};

const setInlineError = (message = "") => {
  loginError.textContent = message;
};

const summarizeOrders = () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);

  let today = 0;
  let week = 0;
  let newCount = 0;

  state.orders.forEach((order) => {
    const created = new Date(order.created_at);
    if (created >= todayStart) today += 1;
    if (created >= weekStart) week += 1;
    if (order.status === "new") newCount += 1;
  });

  return { today, week, newCount };
};

const buildRequestCounts = () => {
  const counts = {};
  state.orders.forEach((order) => {
    (order.items_json || []).forEach((item) => {
      if (!item?.itemId) return;
      counts[item.itemId] = (counts[item.itemId] || 0) + (item.qty || 1);
    });
  });
  state.requestCounts = counts;
};

const animateCount = (element, value) => {
  const duration = 900;
  const start = 0;
  const startTime = performance.now();
  const step = (time) => {
    const progress = Math.min((time - startTime) / duration, 1);
    const nextValue = Math.floor(start + (value - start) * progress);
    element.textContent = nextValue;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const renderKpis = () => {
  const summary = summarizeOrders();
  const activeItems = state.items.filter((item) =>
    ["available", "limited"].includes(item.status)
  ).length;
  const topItemName =
    state.analytics?.topItem?.title ||
    state.items.find((item) => item.item_id in state.requestCounts)?.title ||
    "—";

  kpiRow.innerHTML = `
    <div class="kpi-card">
      <div class="muted">Orders Today</div>
      <strong data-count="${summary.today}">0</strong>
    </div>
    <div class="kpi-card">
      <div class="muted">Orders This Week</div>
      <strong data-count="${summary.week}">0</strong>
    </div>
    <div class="kpi-card">
      <div class="muted">New Orders</div>
      <strong data-count="${summary.newCount}">0</strong>
    </div>
    <div class="kpi-card">
      <div class="muted">Most Requested Item</div>
      <strong>${topItemName}</strong>
    </div>
    <div class="kpi-card">
      <div class="muted">Menu Items Active</div>
      <strong data-count="${activeItems}">0</strong>
    </div>
  `;

  kpiRow.querySelectorAll("strong[data-count]").forEach((el) => {
    animateCount(el, Number(el.dataset.count || 0));
  });

  ordersPulse.textContent = summary.newCount > 0 ? "New orders" : "Live";
};

const renderAttention = () => {
  const attentionItems = [];
  const newOrders = state.orders.filter((order) => order.status === "new").length;
  if (newOrders > 0) {
    attentionItems.push({
      title: `${newOrders} new order${newOrders === 1 ? "" : "s"} waiting`,
      body: "Respond quickly to secure the sale.",
    });
  }

  const unavailableItems = state.items.filter((item) =>
    ["sold_out", "hidden"].includes(item.status)
  ).length;
  if (unavailableItems > 0) {
    attentionItems.push({
      title: `${unavailableItems} item${unavailableItems === 1 ? "" : "s"} unavailable`,
      body: "Update inventory to keep your menu sharp.",
    });
  }

  const completion = getProfileCompletion(state.profile);
  if (completion.missing.length > 0) {
    attentionItems.push({
      title: "Profile incomplete",
      body: `Add ${completion.missing[0]} to unlock full trust.`,
    });
  }

  if (attentionItems.length === 0) {
    attentionList.innerHTML = `
      <div class="empty-state">Everything looks sharp — keep sharing your link.</div>
    `;
    return;
  }

  attentionList.innerHTML = attentionItems
    .map(
      (item) => `
        <div class="attention-item">
          <strong>${item.title}</strong>
          <span class="muted">${item.body}</span>
        </div>
      `
    )
    .join("");
};

const renderStorefrontPreview = () => {
  const fallbackLogo =
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=120&q=80";
  const profile = state.profile || {};
  const previewHtml = `
    <div class="preview-card">
      <img src="${profile.logo_url || fallbackLogo}" alt="Store logo" />
      <div>
        <strong>${profile.name || "Store Name"}</strong>
        <div class="muted">${profile.cuisine_type || "Cuisine type"}</div>
        <div>${profile.about || "Tell customers about your signature experience."}</div>
        <div class="muted">${profile.whatsapp || "WhatsApp not set"}</div>
      </div>
    </div>
  `;

  storefrontPreview.innerHTML = previewHtml;
  profilePreview.innerHTML = previewHtml;
};

const formatPrice = (value) => Formatters.money(value || 0);

const formatStatusLabel = (status) => {
  switch (status) {
    case "available":
      return "Available";
    case "limited":
      return "Limited";
    case "sold_out":
      return "Sold out";
    case "hidden":
      return "Archived";
    default:
      return status || "Unknown";
  }
};

const resolveMenuSort = () => {
  const hasRequests = Object.values(state.requestCounts).some((count) => count > 0);
  const isAuto = menuSort.dataset.auto !== "false";
  if (!hasRequests && menuSort.value === "requested") {
    menuSort.value = "alpha";
    menuSort.dataset.auto = "true";
  } else if (hasRequests && isAuto) {
    menuSort.value = "requested";
  }
};

const renderItemsList = () => {
  const searchTerm = document.getElementById("menuSearch").value.trim().toLowerCase();
  const categoryFilter = document.getElementById("menuCategoryFilter").value;
  const availabilityFilter = document.getElementById("menuAvailabilityFilter").value;
  const sortMode = document.getElementById("menuSort").value || "alpha";

  let filtered = [...state.items];

  if (searchTerm) {
    filtered = filtered.filter((item) =>
      [item.title, item.item_id].some((field) => field?.toLowerCase().includes(searchTerm))
    );
  }
  if (categoryFilter) {
    filtered = filtered.filter((item) => item.category === categoryFilter);
  }
  if (availabilityFilter) {
    filtered = filtered.filter((item) => item.status === availabilityFilter);
  }

  const sorters = {
    requested: (a, b) =>
      (state.requestCounts[b.item_id] || 0) - (state.requestCounts[a.item_id] || 0),
    alpha: (a, b) => a.title.localeCompare(b.title),
    price_desc: (a, b) => (b.price || 0) - (a.price || 0),
    price_asc: (a, b) => (a.price || 0) - (b.price || 0),
  };

  filtered.sort(sorters[sortMode] || sorters.alpha);

  menuCount.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">No menu items yet — publish your first dish in 60 seconds.</div>
    `;
    return;
  }

  itemsList.innerHTML = filtered
    .map((item) => {
      const requestCount = state.requestCounts[item.item_id] || 0;
      const labels = (item.labels || []).slice(0, 3);
      const image =
        item.image_url ||
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=600&q=80";
      return `
        <div class="menu-card">
          <img src="${image}" alt="${item.title}" />
          <div>
            <strong>${item.title}</strong>
            <div class="muted">${item.item_id} · ${item.category}</div>
          </div>
          <div class="badge-row">
            <span class="badge badge-accent">${formatStatusLabel(item.status)}</span>
            ${requestCount > 0 ? `<span class="badge">${requestCount} requests</span>` : ""}
            ${item.featured ? `<span class="badge">Featured</span>` : ""}
          </div>
          <div class="badge-row">
            ${labels.map((label) => `<span class="badge">${label}</span>`).join("")}
          </div>
          <div class="order-meta">
            <strong>${formatPrice(item.price)}</strong>
          </div>
          <div class="order-actions">
            <button class="btn btn-secondary" data-edit="${item.item_id}">Edit</button>
          </div>
        </div>
      `;
    })
    .join("");
};

const renderOrders = () => {
  const newCount = state.orders.filter((order) => order.status === "new").length;
  newOrdersCount.textContent = `${newCount} new`;

  if (state.orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">No new orders — your link is ready to share.</div>
    `;
    return;
  }

  ordersList.innerHTML = state.orders
    .map((order) => {
      const items = order.items_json || [];
      const itemsList = items
        .map((item) => `${item.qty || 1}x ${item.title}`)
        .join(", ");
      const total =
        order.subtotal ||
        items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
      const phone = order.customer_phone ? order.customer_phone.replace(/\D/g, "") : "";
      const message = `Hi ${order.customer_name}, this is ${state.profile?.name}.`;
      const whatsappMessage = `${message} Order ${order.request_id}: ${itemsList}. Total: ${Formatters.money(
        total
      )}`;
      const whatsappUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`
        : "";

      return `
        <div class="order-card ${order.status === "new" ? "new" : ""}">
          <div>
            <strong>${order.request_id}</strong> · ${order.customer_name}
            <div class="muted">${Formatters.dateTime(order.created_at)}</div>
          </div>
          <div class="order-meta">
            <span>${order.customer_phone || "No phone"}</span>
            <span>${order.fulfillment_type || "pickup"} · ${order.parish || "—"}</span>
            <span>Total: ${Formatters.money(total)}</span>
          </div>
          <div class="order-items">
            ${items.map((item) => `<div>${item.qty || 1}x ${item.title}</div>`).join("")}
          </div>
          ${order.notes ? `<div class="muted">Note: ${order.notes}</div>` : ""}
          <div class="order-actions">
            <select data-status="${order.request_id}">
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
            <a
              class="btn btn-secondary"
              href="${whatsappUrl || "#"}"
              ${whatsappUrl ? "target=\"_blank\" rel=\"noreferrer\"" : ""}
              ${whatsappUrl ? "" : "aria-disabled=\"true\""}
            >
              Reply on WhatsApp
            </a>
          </div>
        </div>
      `;
    })
    .join("");

  ordersList.querySelectorAll("select").forEach((select) => {
    const order = state.orders.find((entry) => entry.request_id === select.dataset.status);
    if (order) select.value = order.status;
  });
};

const setProfileForm = () => {
  if (!state.profile) return;
  document.getElementById("profileStoreName").value = state.profile.name || "";
  document.getElementById("profileLogoUrl").value = state.profile.logo_url || "";
  document.getElementById("profileWhatsapp").value = state.profile.whatsapp || "";
  document.getElementById("profileEmail").value = state.profile.profile_email || "";
  document.getElementById("profileCuisine").value = state.profile.cuisine_type || "";
  document.getElementById("profileDescription").value = state.profile.about || "";
  document.getElementById("profileHours").value = state.profile.hours || "";
  document.getElementById("businessAddress").value = state.profile.business_address || "";
  document.getElementById("businessParish").value = state.profile.parish || "";
  document.getElementById("ownerName").value = state.profile.owner_name || "";
  document.getElementById("ownerPhone").value = state.profile.owner_phone || "";
  document.getElementById("ownerEmail").value = state.profile.owner_email || "";
  document.getElementById("instagramHandle").value = state.profile.instagram || "";
  document.getElementById("tiktokHandle").value = state.profile.tiktok || "";
  document.getElementById("pickupEnabled").checked = state.profile.pickup_enabled ?? true;
  document.getElementById("deliveryEnabled").checked = state.profile.delivery_enabled ?? true;
  renderProfileCompletion();
  renderStorefrontPreview();
};

const getProfileCompletion = (profile = {}) => {
  const fields = {
    "store name": profile.name,
    logo: profile.logo_url,
    whatsapp: profile.whatsapp,
    "contact email": profile.profile_email,
    "cuisine type": profile.cuisine_type,
    description: profile.about,
    "operating hours": profile.hours,
  };
  const missing = Object.keys(fields).filter((key) => !fields[key]);
  const completed = Object.keys(fields).length - missing.length;
  const percent = Math.round((completed / Object.keys(fields).length) * 100);
  return { percent, missing };
};

const renderProfileCompletion = () => {
  const completion = getProfileCompletion(state.profile || {});
  completionValue.textContent = `${completion.percent}%`;
  completionBar.style.width = `${completion.percent}%`;
};

const renderMediaPreview = (imageUrl, videoUrl) => {
  mediaPreview.innerHTML = "";
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "Preview";
    mediaPreview.appendChild(img);
  }
  if (videoUrl) {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.controls = true;
    mediaPreview.appendChild(video);
  }
};

const updateLabelSelection = (labels = []) => {
  document.querySelectorAll(".label-checkbox").forEach((checkbox) => {
    checkbox.checked = labels.includes(checkbox.value);
  });
};

const setAvailabilityFromStatus = (status) => {
  const availableToggle = document.getElementById("itemAvailable");
  const limitedToggle = document.getElementById("itemLimited");

  if (status === "limited") {
    availableToggle.checked = true;
    limitedToggle.checked = true;
  } else if (status === "available") {
    availableToggle.checked = true;
    limitedToggle.checked = false;
  } else {
    availableToggle.checked = false;
    limitedToggle.checked = false;
  }
};

const getStatusFromAvailability = () => {
  const available = document.getElementById("itemAvailable").checked;
  const limited = document.getElementById("itemLimited").checked;
  if (!available) return "sold_out";
  if (limited) return "limited";
  return "available";
};

const clearItemForm = () => {
  document.getElementById("itemId").value = "";
  document.getElementById("itemTitle").value = "";
  document.getElementById("itemDescription").value = "";
  document.getElementById("itemCategory").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemFeatured").checked = false;
  document.getElementById("itemImageUrl").value = "";
  document.getElementById("itemVideoUrl").value = "";
  document.getElementById("customLabel").value = "";
  updateLabelSelection([]);
  setAvailabilityFromStatus("available");
  renderMediaPreview();
};

const loadDashboard = async () => {
  const profileData = await Api.merchant.me();
  state.profile = profileData.profile;
  storeName.textContent = state.profile.name || "Store";
  storeStatus.textContent = state.profile.status || "active";
  storeLogo.src =
    state.profile.logo_url ||
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=160&q=80";

  const itemsData = await Api.merchant.menu();
  state.items = itemsData.items || [];

  const ordersData = await Api.merchant.orders();
  state.orders = (ordersData.orders || []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const analyticsData = await Api.merchant.analytics();
  state.analytics = analyticsData.analytics;

  buildRequestCounts();
  resolveMenuSort();
  renderKpis();
  renderAttention();
  renderStorefrontPreview();
  renderItemsList();
  renderOrders();
  setProfileForm();
};

const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", async () => {
  try {
    setInlineError();
    UI.setLoading(loginBtn, true);
    const data = await Api.merchant.login({
      storeIdOrEmail: document.getElementById("loginId").value.trim(),
      password: document.getElementById("loginPass").value.trim(),
    });
    localStorage.setItem("merchant_token", data.token);
    loginView.hidden = true;
    dashboardView.hidden = false;
    await loadDashboard();
  } catch (error) {
    setInlineError(error.message);
    UI.toast(error.message, "error");
  } finally {
    UI.setLoading(loginBtn, false);
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  resetToLogin();
});

document.getElementById("refreshBtn").addEventListener("click", async () => {
  try {
    await loadDashboard();
    UI.toast("Dashboard refreshed", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((btn) => btn.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    dashboardPanel.hidden = target !== "dashboard";
    menuPanel.hidden = target !== "menu";
    ordersPanel.hidden = target !== "orders";
    profilePanel.hidden = target !== "profile";
  });
});

itemsList.addEventListener("click", (event) => {
  const itemId = event.target.dataset.edit;
  if (!itemId) return;
  const item = state.items.find((entry) => entry.item_id === itemId);
  if (!item) return;
  document.getElementById("itemId").value = item.item_id || "";
  document.getElementById("itemTitle").value = item.title || "";
  document.getElementById("itemDescription").value = item.description || "";
  document.getElementById("itemCategory").value = item.category || "";
  document.getElementById("itemPrice").value = item.price || "";
  document.getElementById("itemFeatured").checked = !!item.featured;
  document.getElementById("itemImageUrl").value = item.image_url || "";
  document.getElementById("itemVideoUrl").value = item.video_url || "";
  document.getElementById("customLabel").value = "";
  updateLabelSelection(item.labels || []);
  setAvailabilityFromStatus(item.status || "available");
  renderMediaPreview(item.image_url, item.video_url);
});

const getSelectedLabels = () => {
  const labels = Array.from(document.querySelectorAll(".label-checkbox"))
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  const custom = document.getElementById("customLabel").value.trim();
  if (custom) labels.push(custom);
  return labels;
};

const saveItemBtn = document.getElementById("saveItemBtn");
saveItemBtn.addEventListener("click", async () => {
  const payload = {
    item_id: document.getElementById("itemId").value.trim(),
    title: document.getElementById("itemTitle").value.trim(),
    description: document.getElementById("itemDescription").value.trim(),
    category: document.getElementById("itemCategory").value,
    price: Number(document.getElementById("itemPrice").value),
    status: getStatusFromAvailability(),
    featured: document.getElementById("itemFeatured").checked,
    image_url: document.getElementById("itemImageUrl").value.trim(),
    video_url: document.getElementById("itemVideoUrl").value.trim(),
    labels: getSelectedLabels(),
  };

  if (!payload.item_id || !payload.title || !payload.description || !payload.category) {
    UI.toast("Please complete item_id, title, description, and category.", "error");
    return;
  }

  try {
    UI.setLoading(saveItemBtn, true);
    const data = await Api.merchant.saveItem(payload);
    const existingIndex = state.items.findIndex((item) => item.item_id === data.item.item_id);
    if (existingIndex >= 0) {
      state.items[existingIndex] = data.item;
    } else {
      state.items.unshift(data.item);
    }
    buildRequestCounts();
    renderItemsList();
    renderKpis();
    UI.toast("Item saved", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  } finally {
    UI.setLoading(saveItemBtn, false);
  }
});

document.getElementById("resetItemBtn").addEventListener("click", () => {
  clearItemForm();
});

document.getElementById("hideItemBtn").addEventListener("click", async () => {
  const itemId = document.getElementById("itemId").value.trim();
  if (!itemId) {
    UI.toast("Select an item to archive", "error");
    return;
  }
  try {
    const data = await Api.merchant.hideItem(itemId);
    const existingIndex = state.items.findIndex((item) => item.item_id === data.item.item_id);
    if (existingIndex >= 0) {
      state.items[existingIndex] = data.item;
    }
    renderItemsList();
    renderKpis();
    UI.toast("Item archived", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

const uploadInput = document.getElementById("uploadInput");
const uploadBtn = document.getElementById("uploadBtn");

const handleUpload = async () => {
  const files = Array.from(uploadInput.files || []);
  if (!files.length) {
    UI.toast("Select a file to upload", "error");
    return;
  }
  const itemId = document.getElementById("itemId").value.trim() || "general";
  const formData = new FormData();
  formData.append("files", files[0]);
  formData.append("itemId", itemId);
  try {
    UI.setLoading(uploadBtn, true);
    const data = await Api.merchant.uploadMedia(formData);
    const url = data.urls?.[0];
    if (!url) {
      UI.toast("Upload failed", "error");
      return;
    }
    if (files[0].type.startsWith("video/")) {
      document.getElementById("itemVideoUrl").value = url;
    } else {
      document.getElementById("itemImageUrl").value = url;
    }
    renderMediaPreview(
      document.getElementById("itemImageUrl").value.trim(),
      document.getElementById("itemVideoUrl").value.trim()
    );
    UI.toast("Media uploaded", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  } finally {
    UI.setLoading(uploadBtn, false);
  }
};

uploadBtn.addEventListener("click", handleUpload);
uploadInput.addEventListener("change", () => {
  if (uploadInput.files?.length) {
    handleUpload();
  }
});

ordersList.addEventListener("change", async (event) => {
  if (!event.target.dataset.status) return;
  try {
    const data = await Api.merchant.updateOrderStatus(event.target.dataset.status, {
      status: event.target.value,
    });
    const orderIndex = state.orders.findIndex(
      (order) => order.request_id === data.order.request_id
    );
    if (orderIndex >= 0) {
      state.orders[orderIndex] = data.order;
    }
    UI.toast("Status updated", "success");
    const analyticsData = await Api.merchant.analytics();
    state.analytics = analyticsData.analytics;
    renderOrders();
    renderKpis();
    renderAttention();
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

document
  .getElementById("saveProfileBtn")
  .addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("profileStoreName").value.trim(),
      logo_url: document.getElementById("profileLogoUrl").value.trim(),
      whatsapp: document.getElementById("profileWhatsapp").value.trim(),
      profile_email: document.getElementById("profileEmail").value.trim(),
      cuisine_type: document.getElementById("profileCuisine").value.trim(),
      about: document.getElementById("profileDescription").value.trim(),
      hours: document.getElementById("profileHours").value.trim(),
      business_address: document.getElementById("businessAddress").value.trim(),
      parish: document.getElementById("businessParish").value.trim(),
      owner_name: document.getElementById("ownerName").value.trim(),
      owner_phone: document.getElementById("ownerPhone").value.trim(),
      owner_email: document.getElementById("ownerEmail").value.trim(),
      instagram: document.getElementById("instagramHandle").value.trim(),
      tiktok: document.getElementById("tiktokHandle").value.trim(),
      pickup_enabled: document.getElementById("pickupEnabled").checked,
      delivery_enabled: document.getElementById("deliveryEnabled").checked,
    };
    const hasBasics =
      payload.name && payload.business_address && payload.owner_name && payload.owner_phone;
    if (hasBasics) {
      payload.authorized = true;
    }
    try {
      const data = await Api.merchant.updateProfile(payload);
      state.profile = data.profile;
      storeName.textContent = state.profile.name || "Store";
      storeStatus.textContent = state.profile.status || "active";
      storeLogo.src = state.profile.logo_url || storeLogo.src;
      renderProfileCompletion();
      renderStorefrontPreview();
      renderAttention();
      UI.toast("Profile updated", "success");
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  });

document.getElementById("menuSearch").addEventListener("input", renderItemsList);

["menuCategoryFilter", "menuAvailabilityFilter", "menuSort"].forEach((id) => {
  document.getElementById(id).addEventListener("change", renderItemsList);
});

menuSort.addEventListener("change", (event) => {
  event.target.dataset.auto = "false";
});

const boot = async () => {
  if (localStorage.getItem("merchant_token")) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    try {
      await loadDashboard();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
};

clearItemForm();
boot();
