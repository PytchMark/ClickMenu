const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginError = document.getElementById("loginError");
const loginDebug = document.getElementById("loginDebug");
const loginDebugEndpoint = document.getElementById("loginDebugEndpoint");
const loginDebugStatus = document.getElementById("loginDebugStatus");
const loginDebugSnippet = document.getElementById("loginDebugSnippet");
const loginDebugHint = document.getElementById("loginDebugHint");
const storeName = document.getElementById("storeName");
const storeStatus = document.getElementById("storeStatus");
const storeLogo = document.getElementById("storeLogo");
const kpiRow = document.getElementById("kpiRow");
const attentionList = document.getElementById("attentionList");
const storefrontPreview = document.getElementById("storefrontPreview");
const ordersPulse = document.getElementById("ordersPulse");
const viewStorefrontBtn = document.getElementById("viewStorefrontBtn");
const ordersTrendChart = document.getElementById("ordersTrendChart");
const ordersTrendLegend = document.getElementById("ordersTrendLegend");
const fulfillmentMixChart = document.getElementById("fulfillmentMixChart");
const fulfillmentMixLegend = document.getElementById("fulfillmentMixLegend");

const dashboardPanel = document.getElementById("dashboardPanel");
const menuPanel = document.getElementById("menuPanel");
const ordersPanel = document.getElementById("ordersPanel");
const profilePanel = document.getElementById("profilePanel");
const settingsPanel = document.getElementById("settingsPanel");

const menuCount = document.getElementById("menuCount");
const itemsList = document.getElementById("itemsList");
const ordersList = document.getElementById("ordersList");
const newOrdersCount = document.getElementById("newOrdersCount");
const menuSort = document.getElementById("menuSort");
const orderSearch = document.getElementById("orderSearch");
const orderStatusFilter = document.getElementById("orderStatusFilter");

const mediaPreview = document.getElementById("mediaPreview");
const profilePreview = document.getElementById("profilePreview");
const completionValue = document.getElementById("completionValue");
const completionBar = document.getElementById("completionBar");
const completionChecklist = document.getElementById("completionChecklist");
const orderDrawer = document.getElementById("orderDrawer");
const orderBackdrop = document.getElementById("orderBackdrop");
const drawerOrderId = document.getElementById("drawerOrderId");
const drawerOrderMeta = document.getElementById("drawerOrderMeta");
const drawerCustomer = document.getElementById("drawerCustomer");
const drawerItems = document.getElementById("drawerItems");
const drawerNotes = document.getElementById("drawerNotes");
const drawerWhatsappBtn = document.getElementById("drawerWhatsappBtn");
const closeOrderDrawer = document.getElementById("closeOrderDrawer");
const markContactedBtn = document.getElementById("markContactedBtn");
const markReadyBtn = document.getElementById("markReadyBtn");
const markClosedBtn = document.getElementById("markClosedBtn");

const state = {
  profile: null,
  items: [],
  orders: [],
  analytics: null,
  requestCounts: {},
  activeOrder: null,
  scrollPositions: {},
  activeSection: "dashboard",
  sectionTimeouts: {},
};

menuSort.dataset.auto = "true";

const isAuthError = (error) =>
  error && ["Invalid token", "Missing token", "Forbidden"].includes(error.message);

const resetToLogin = () => {
  localStorage.removeItem("merchant_token");
  localStorage.removeItem("merchant_store_id");
  loginView.hidden = false;
  dashboardView.hidden = true;
  loginDebug.hidden = true;
  loginDebug.open = false;
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

const setLoginDebug = (details = {}) => {
  if (!details.url && !details.status) {
    loginDebug.hidden = true;
    loginDebug.open = false;
    return;
  }
  loginDebug.hidden = false;
  loginDebugEndpoint.textContent = details.url || "—";
  loginDebugStatus.textContent = details.status ? `${details.status}` : "—";
  loginDebugSnippet.textContent = details.snippet || "—";
  loginDebugHint.textContent =
    details.hint || "Check Cloud Run env vars + server route";
};

const getLoginErrorMessage = (error) => {
  if (error?.isNonJson && error?.status) {
    return `Login failed (${error.status}). Server returned non-JSON response. Check /api/merchant/login route + Cloud Run service health.`;
  }
  if (error?.status) {
    return `Login failed (${error.status}). ${error.message}`;
  }
  return error.message || "Login failed";
};

const panelMap = {
  dashboard: dashboardPanel,
  menu: menuPanel,
  orders: ordersPanel,
  profile: profilePanel,
  settings: settingsPanel,
};

const SECTION_STORAGE_KEY = "merchant_active_section";

const setSection = (section) => {
  if (!panelMap[section]) return;
  document
    .querySelectorAll(".sidebar-link")
    .forEach((btn) => btn.classList.remove("active"));
  const nextLink = document.querySelector(`.sidebar-link[data-section="${section}"]`);
  if (nextLink) nextLink.classList.add("active");

  document.querySelectorAll(".panel-section").forEach((panel) => {
    panel.hidden = true;
    panel.classList.remove("is-active");
  });
  const nextPanel = panelMap[section];
  nextPanel.hidden = false;
  nextPanel.classList.add("is-active");
  state.activeSection = section;
  localStorage.setItem(SECTION_STORAGE_KEY, section);
};

const getStoredSection = () => {
  const stored = localStorage.getItem(SECTION_STORAGE_KEY);
  return panelMap[stored] ? stored : "dashboard";
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
  const unavailableItems = state.items.filter((item) =>
    ["sold_out", "hidden"].includes(item.status)
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
    <div class="kpi-card">
      <div class="muted">Items Unavailable</div>
      <strong data-count="${unavailableItems}">0</strong>
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

const getLastSevenDays = () => {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    days.push(date);
  }
  return days;
};

const renderOrdersTrend = () => {
  if (!ordersTrendChart || !ordersTrendLegend) return;
  const days = getLastSevenDays();
  const counts = days.map((date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return state.orders.filter((order) => {
      const created = new Date(order.created_at);
      return created >= start && created < end;
    }).length;
  });
  const max = Math.max(1, ...counts);
  ordersTrendChart.innerHTML = counts
    .map((count, index) => {
      const height = Math.round((count / max) * 100);
      const label = days[index].toLocaleDateString(undefined, { weekday: "short" });
      return `
        <div class="bar">
          <span style="height:${height}%"></span>
          <em>${label}</em>
        </div>
      `;
    })
    .join("");
  ordersTrendLegend.innerHTML = `
    <div><strong>${counts.reduce((sum, val) => sum + val, 0)}</strong><span>Total</span></div>
    <div><strong>${Math.max(...counts)}</strong><span>Peak day</span></div>
  `;
};

const renderFulfillmentMix = () => {
  if (!fulfillmentMixChart || !fulfillmentMixLegend) return;
  const totals = state.orders.reduce(
    (acc, order) => {
      const type = order.fulfillment_type || "pickup";
      if (type === "delivery") acc.delivery += 1;
      else if (type === "pickup") acc.pickup += 1;
      else acc.other += 1;
      return acc;
    },
    { pickup: 0, delivery: 0, other: 0 }
  );
  const totalCount = totals.pickup + totals.delivery + totals.other || 1;
  const pickupPct = Math.round((totals.pickup / totalCount) * 100);
  const deliveryPct = Math.round((totals.delivery / totalCount) * 100);
  const otherPct = Math.max(0, 100 - pickupPct - deliveryPct);
  fulfillmentMixChart.innerHTML = `
    <div class="stacked-bar">
      <span class="pickup" style="width:${pickupPct}%"></span>
      <span class="delivery" style="width:${deliveryPct}%"></span>
      <span class="other" style="width:${otherPct}%"></span>
    </div>
  `;
  fulfillmentMixLegend.innerHTML = `
    <div><i class="legend-swatch pickup"></i><strong>${pickupPct}%</strong><span>Pickup</span></div>
    <div><i class="legend-swatch delivery"></i><strong>${deliveryPct}%</strong><span>Delivery</span></div>
    <div><i class="legend-swatch other"></i><strong>${otherPct}%</strong><span>Other</span></div>
  `;
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

const formatOrderStatus = (status) => {
  switch (status) {
    case "new":
      return "New";
    case "confirmed":
      return "Contacted";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "completed":
      return "Completed";
    case "canceled":
      return "Canceled";
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
    itemsList.innerHTML = `<div class="empty-state">No menu items yet — publish your first dish in 60 seconds.</div>`;
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
        <div class="list-row menu-row" data-item="${item.item_id}">
          <div class="row-cell" data-label="Item">
            <div class="row-title">
              <img src="${image}" alt="${item.title}" />
              <div>
                <strong>${item.title}</strong>
                <div class="muted">${item.item_id} · ${item.category}</div>
                <div class="badge-row">
                  ${labels.map((label) => `<span class="badge">${label}</span>`).join("")}
                  ${item.featured ? `<span class="badge badge-accent">Featured</span>` : ""}
                </div>
              </div>
            </div>
          </div>
          <div class="row-cell" data-label="Status">
            <span class="status-pill status-${item.status || "available"}">${formatStatusLabel(
              item.status
            )}</span>
          </div>
          <div class="row-cell" data-label="Price">
            <strong>${formatPrice(item.price)}</strong>
          </div>
          <div class="row-cell" data-label="Requests">
            <span class="badge">${requestCount} requests</span>
          </div>
          <div class="row-cell" data-label="Actions">
            <div class="row-actions">
              <button class="btn btn-secondary btn-sm" data-edit="${item.item_id}">Edit</button>
              <button class="btn btn-ghost btn-sm" data-toggle="${item.item_id}">
                ${item.status === "sold_out" ? "Mark available" : "Mark sold out"}
              </button>
              <button class="btn btn-ghost btn-sm" data-archive="${item.item_id}">Archive</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
};

const matchOrderFilter = (order, filter) => {
  if (!filter) return true;
  if (filter === "new") return order.status === "new";
  if (filter === "in_progress") {
    return ["confirmed", "preparing", "ready"].includes(order.status);
  }
  if (filter === "completed") {
    return ["completed", "canceled"].includes(order.status);
  }
  return true;
};

const renderOrders = () => {
  const newCount = state.orders.filter((order) => order.status === "new").length;
  newOrdersCount.textContent = `${newCount} new`;

  const searchTerm = orderSearch.value.trim().toLowerCase();
  const statusFilter = orderStatusFilter.value;
  const filteredOrders = state.orders.filter((order) => {
    const matchesSearch = searchTerm
      ? [order.customer_name, order.request_id]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchTerm))
      : true;
    return matchesSearch && matchOrderFilter(order, statusFilter);
  });

  if (filteredOrders.length === 0) {
    ordersList.innerHTML = `<div class="empty-state">No orders match this view yet.</div>`;
    return;
  }

  ordersList.innerHTML = filteredOrders
    .map((order) => {
      const items = order.items_json || [];
      const itemsListText = items
        .map((item) => `${item.qty || 1}x ${item.title}`)
        .join(", ");
      const total =
        order.subtotal ||
        items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
      return `
        <div class="list-row order-row ${order.status === "new" ? "is-new" : ""}">
          <div class="row-cell" data-label="Order">
            <div class="row-title">
              <div>
                <strong>${order.request_id}</strong>
                <div class="muted">${order.customer_name} · ${Formatters.dateTime(
                  order.created_at
                )}</div>
                <div class="muted">${itemsListText || "No items listed"}</div>
              </div>
            </div>
          </div>
          <div class="row-cell" data-label="Status">
            <span class="status-pill status-${order.status || "new"}">${formatOrderStatus(
              order.status
            )}</span>
          </div>
          <div class="row-cell" data-label="Fulfillment">
            <span>${order.fulfillment_type || "pickup"} · ${order.parish || "—"}</span>
          </div>
          <div class="row-cell" data-label="Total">
            <strong>${Formatters.money(total)}</strong>
          </div>
          <div class="row-cell" data-label="Actions">
            <div class="row-actions">
              <button class="btn btn-secondary btn-sm" data-open="${order.request_id}">
                View
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
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
  completionChecklist.innerHTML = completion.missing.length
    ? completion.missing
        .map((item) => `<div class="checklist-item">Missing ${item}</div>`)
        .join("")
    : `<div class="checklist-item complete">All essential fields complete.</div>`;
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

const renderItemsSkeleton = () => {
  itemsList.innerHTML = `
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
  `;
};

const renderOrdersSkeleton = () => {
  ordersList.innerHTML = `
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
  `;
};

const loadDashboard = async (profileOverride = null) => {
  renderItemsSkeleton();
  renderOrdersSkeleton();
  const profileData = profileOverride ? { profile: profileOverride } : await Api.merchant.me();
  state.profile = profileData.profile;
  storeName.textContent = state.profile.name || "Store";
  storeStatus.textContent = state.profile.status || "active";
  storeLogo.src =
    state.profile.logo_url ||
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=160&q=80";
  if (state.profile.store_id) {
    viewStorefrontBtn.href = `/storefront?storeId=${encodeURIComponent(
      state.profile.store_id
    )}`;
    localStorage.setItem("merchant_store_id", state.profile.store_id);
  }

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
  renderOrdersTrend();
  renderFulfillmentMix();
  renderItemsList();
  renderOrders();
  setProfileForm();
};

const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", async () => {
  try {
    setInlineError();
    setLoginDebug();
    UI.setLoading(loginBtn, true);
    const data = await Api.merchant.login({
      identifier: document.getElementById("loginId").value.trim(),
      passcode: document.getElementById("loginPass").value.trim(),
    });
    localStorage.setItem("merchant_token", data.token);
    if (data.merchant?.store_id) {
      localStorage.setItem("merchant_store_id", data.merchant.store_id);
    }
    loginView.hidden = true;
    dashboardView.hidden = false;
    setSection(getStoredSection());
    await loadDashboard(state.profile);
  } catch (error) {
    const message = getLoginErrorMessage(error);
    setInlineError(message);
    UI.toast(message, "error");
    setLoginDebug({
      url: error.url,
      status: error.status,
      snippet: error.snippet,
      hint: "Check Cloud Run env vars + server route",
    });
  } finally {
    UI.setLoading(loginBtn, false);
  }
});

const logoutBtn = document.getElementById("logoutBtn");
const settingsRefreshBtn = document.getElementById("settingsRefreshBtn");
const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");

logoutBtn.addEventListener("click", () => {
  resetToLogin();
});

document.getElementById("refreshBtn").addEventListener("click", async () => {
  try {
    await loadDashboard(state.profile);
    UI.toast("Dashboard refreshed", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

settingsRefreshBtn.addEventListener("click", async () => {
  try {
    await loadDashboard(state.profile);
    UI.toast("Dashboard refreshed", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

settingsLogoutBtn.addEventListener("click", () => {
  resetToLogin();
});

document.querySelectorAll(".sidebar-link").forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.section;
    setSection(target);
  });
});

itemsList.addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const toggleId = event.target.dataset.toggle;
  const archiveId = event.target.dataset.archive;
  const itemId = editId || toggleId || archiveId;
  if (!itemId) return;
  const item = state.items.find((entry) => entry.item_id === itemId);
  if (!item) return;
  if (editId) {
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
    return;
  }
  if (toggleId) {
    const nextStatus = item.status === "sold_out" ? "available" : "sold_out";
    Api.merchant
      .updateItem(item.item_id, { status: nextStatus })
      .then((data) => {
        const existingIndex = state.items.findIndex(
          (entry) => entry.item_id === data.item.item_id
        );
        if (existingIndex >= 0) {
          state.items[existingIndex] = data.item;
        }
        renderItemsList();
        renderKpis();
      })
      .catch((error) => {
        if (!handleAuthError(error)) {
          UI.toast(error.message, "error");
        }
      });
  }
  if (archiveId) {
    Api.merchant
      .hideItem(item.item_id)
      .then((data) => {
        const existingIndex = state.items.findIndex(
          (entry) => entry.item_id === data.item.item_id
        );
        if (existingIndex >= 0) {
          state.items[existingIndex] = data.item;
        }
        renderItemsList();
        renderKpis();
      })
      .catch((error) => {
        if (!handleAuthError(error)) {
          UI.toast(error.message, "error");
        }
      });
  }
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

  if (
    !payload.item_id ||
    !payload.title ||
    !payload.description ||
    !payload.category ||
    Number.isNaN(payload.price)
  ) {
    UI.toast(
      "Please complete item_id, title, description, category, and price.",
      "error"
    );
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
  const nextFile = files[0];
  const isVideo = nextFile.type.startsWith("video/");
  const existingImage = document.getElementById("itemImageUrl").value.trim();
  const existingVideo = document.getElementById("itemVideoUrl").value.trim();
  if (!isVideo && existingImage) {
    UI.toast("Only one image is allowed per item.", "error");
    return;
  }
  if (isVideo && existingVideo) {
    UI.toast("Only one video is allowed per item.", "error");
    return;
  }
  const itemId = document.getElementById("itemId").value.trim() || "general";
  const formData = new FormData();
  formData.append("files", nextFile);
  formData.append("itemId", itemId);
  try {
    UI.setLoading(uploadBtn, true);
    const data = await Api.merchant.uploadMedia(formData);
    const url = data.urls?.[0];
    if (!url) {
      UI.toast("Upload failed", "error");
      return;
    }
    if (nextFile.type.startsWith("video/")) {
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

const openOrderDrawer = (order) => {
  state.activeOrder = order;
  if (!order) return;
  drawerOrderId.textContent = `Order ${order.request_id}`;
  drawerOrderMeta.textContent = `${order.customer_name} · ${Formatters.dateTime(
    order.created_at
  )}`;
  drawerCustomer.innerHTML = `
    <h4>Customer</h4>
    <div class="drawer-meta">
      <span>${order.customer_phone || "No phone"}</span>
      <span>${order.fulfillment_type || "pickup"} · ${order.parish || "—"}</span>
    </div>
  `;
  const items = order.items_json || [];
  drawerItems.innerHTML = `
    <h4>Items</h4>
    <div class="drawer-items">
      ${items.map((item) => `<div>${item.qty || 1}x ${item.title}</div>`).join("")}
    </div>
  `;
  drawerNotes.innerHTML = order.notes
    ? `<h4>Notes</h4><p class="muted">${order.notes}</p>`
    : "";
  const total =
    order.subtotal ||
    items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const phone = order.customer_phone ? order.customer_phone.replace(/\D/g, "") : "";
  const message = `Hi ${order.customer_name}, this is ${state.profile?.name}.`;
  const whatsappMessage = `${message} Order ${order.request_id}: ${items
    .map((item) => `${item.qty || 1}x ${item.title}`)
    .join(", ")}. Total: ${Formatters.money(total)}`;
  drawerWhatsappBtn.href = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`
    : "#";
  drawerWhatsappBtn.setAttribute("aria-disabled", phone ? "false" : "true");
  orderDrawer.classList.add("show");
  orderDrawer.setAttribute("aria-hidden", "false");
  orderBackdrop.classList.add("show");
};

const closeDrawer = () => {
  orderDrawer.classList.remove("show");
  orderDrawer.setAttribute("aria-hidden", "true");
  orderBackdrop.classList.remove("show");
  state.activeOrder = null;
};

const updateActiveOrderStatus = async (status) => {
  if (!state.activeOrder) return;
  try {
    const data = await Api.merchant.updateOrderStatus(state.activeOrder.request_id, {
      status,
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
    openOrderDrawer(data.order);
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

ordersList.addEventListener("click", (event) => {
  const openId = event.target.dataset.open;
  if (!openId) return;
  const order = state.orders.find((entry) => entry.request_id === openId);
  if (order) {
    openOrderDrawer(order);
  }
});

closeOrderDrawer.addEventListener("click", closeDrawer);
orderBackdrop.addEventListener("click", closeDrawer);

markContactedBtn.addEventListener("click", () => updateActiveOrderStatus("confirmed"));
markReadyBtn.addEventListener("click", () => updateActiveOrderStatus("ready"));
markClosedBtn.addEventListener("click", () => updateActiveOrderStatus("completed"));

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

orderSearch.addEventListener("input", renderOrders);
orderStatusFilter.addEventListener("change", renderOrders);

menuSort.addEventListener("change", (event) => {
  event.target.dataset.auto = "false";
});

const boot = async () => {
  loginView.hidden = false;
  dashboardView.hidden = true;
  setSection("dashboard");
  const token = localStorage.getItem("merchant_token");
  if (!token) return;
  try {
    const profileData = await Api.merchant.me();
    if (!profileData?.profile) {
      resetToLogin();
      return;
    }
    state.profile = profileData.profile;
    loginView.hidden = true;
    dashboardView.hidden = false;
    setSection(getStoredSection());
    await loadDashboard(state.profile);
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

clearItemForm();
boot();
