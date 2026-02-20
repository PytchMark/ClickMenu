const loginView = document.getElementById("loginView");
const adminShell = document.getElementById("adminShell");
const drawer = document.getElementById("drawer");
const drawerContent = document.getElementById("drawerContent");
const filterRow = document.getElementById("filterRow");

const overviewCards = document.getElementById("overviewCards");
const opsPulse = document.getElementById("opsPulse");
const overviewOrders = document.getElementById("overviewOrders");

const merchantTableBody = document.getElementById("merchantTableBody");
const merchantPagination = document.getElementById("merchantPagination");
const merchantStatusFilter = document.getElementById("merchantStatusFilter");
const merchantParishFilter = document.getElementById("merchantParishFilter");
const merchantSort = document.getElementById("merchantSort");
const selectAllMerchants = document.getElementById("selectAllMerchants");
const bulkActivateBtn = document.getElementById("bulkActivateBtn");
const bulkPauseBtn = document.getElementById("bulkPauseBtn");
const bulkResetBtn = document.getElementById("bulkResetBtn");
const bulkExportBtn = document.getElementById("bulkExportBtn");

const menuTableBody = document.getElementById("menuTableBody");
const menuPagination = document.getElementById("menuPagination");
const menuStoreFilter = document.getElementById("menuStoreFilter");
const menuCategoryFilter = document.getElementById("menuCategoryFilter");
const menuAvailabilityFilter = document.getElementById("menuAvailabilityFilter");
const menuFeaturedFilter = document.getElementById("menuFeaturedFilter");
const menuMissingMedia = document.getElementById("menuMissingMedia");

const ordersTableBody = document.getElementById("ordersTableBody");
const ordersPagination = document.getElementById("ordersPagination");
const ordersStoreFilter = document.getElementById("ordersStoreFilter");
const ordersStatusFilter = document.getElementById("ordersStatusFilter");
const ordersFrom = document.getElementById("ordersFrom");
const ordersTo = document.getElementById("ordersTo");

const analyticsCards = document.getElementById("analyticsCards");
const topMerchants = document.getElementById("topMerchants");
const topItems = document.getElementById("topItems");
const deadMerchants = document.getElementById("deadMerchants");

const modal = document.getElementById("modal");

const state = {
  view: "overview",
  summary: null,
  overviewOrders: [],
  merchants: {
    items: [],
    total: 0,
    limit: 20,
    offset: 0,
    q: "",
    status: "",
    parish: "",
    sort: "newest",
    selected: new Set(),
  },
  menuItems: {
    items: [],
    total: 0,
    limit: 20,
    offset: 0,
    q: "",
    storeId: "",
    category: "",
    availability: "",
    featured: "",
    missingMedia: false,
  },
  orders: {
    items: [],
    total: 0,
    limit: 20,
    offset: 0,
    q: "",
    storeId: "",
    status: "",
    from: "",
    to: "",
  },
  analytics: {
    totals: null,
    topMerchants: [],
    topItems: [],
    deadMerchants: [],
  },
};

const savedViews = [
  {
    label: "Needs attention",
    filter: { status: "flagged" },
  },
  {
    label: "New onboarding",
    filter: { status: "onboarding" },
  },
  {
    label: "Paused",
    filter: { status: "paused" },
  },
  {
    label: "Top performers",
    filter: { sort: "orders" },
  },
];

const isAuthError = (error) =>
  error && ["Invalid token", "Missing token", "Forbidden"].includes(error.message);

const resetToLogin = () => {
  localStorage.removeItem("admin_token");
  adminShell.classList.add("hidden");
  loginView.classList.remove("hidden");
};

const handleAuthError = (error) => {
  if (isAuthError(error)) {
    resetToLogin();
    return true;
  }
  return false;
};

const setActiveView = (view) => {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
  renderFilterRow();
};

const renderFilterRow = () => {
  if (state.view !== "merchants") {
    filterRow.classList.add("hidden");
    filterRow.innerHTML = "";
    return;
  }
  filterRow.classList.remove("hidden");
  filterRow.innerHTML = savedViews
    .map(
      (item) => `
    <button class="chip" data-filter='${JSON.stringify(item.filter)}'>${item.label}</button>
  `
    )
    .join("");
};

const paginate = (pageState, direction) => {
  const nextOffset = Math.max(0, pageState.offset + direction * pageState.limit);
  if (direction > 0 && nextOffset >= pageState.total) return pageState.offset;
  pageState.offset = nextOffset;
  return pageState.offset;
};

const renderPagination = (container, pageState, onPrev, onNext) => {
  const start = pageState.total === 0 ? 0 : pageState.offset + 1;
  const end = Math.min(pageState.offset + pageState.limit, pageState.total);
  container.innerHTML = `
    <span>${start}-${end} of ${pageState.total}</span>
    <button class="btn ghost" data-action="prev">Prev</button>
    <button class="btn ghost" data-action="next">Next</button>
  `;
  container.querySelector('[data-action="prev"]').onclick = onPrev;
  container.querySelector('[data-action="next"]').onclick = onNext;
};

let ordersChart = null;
let merchantChart = null;

const renderSummary = () => {
  if (!state.summary) return;
  const summary = state.summary;
  
  // Calculate trends (mock data - would come from API in production)
  const ordersTrend = summary.ordersToday > 0 ? Math.round((summary.ordersToday / Math.max(1, summary.orders7dAvg || summary.ordersToday)) * 100 - 100) : 0;
  
  overviewCards.innerHTML = `
    <div class="card">
      <strong>${summary.totalStores || 0}</strong>
      <div class="muted">Total Merchants</div>
      <div class="card-trend ${summary.newStoresThisWeek > 0 ? 'up' : ''}">
        ${summary.newStoresThisWeek > 0 ? `<i class="fas fa-arrow-up"></i> ${summary.newStoresThisWeek} this week` : '—'}
      </div>
    </div>
    <div class="card">
      <strong>${summary.ordersToday || 0}</strong>
      <div class="muted">Orders Today</div>
      <div class="card-trend ${ordersTrend >= 0 ? 'up' : 'down'}">
        <i class="fas fa-arrow-${ordersTrend >= 0 ? 'up' : 'down'}"></i> ${Math.abs(ordersTrend)}% vs avg
      </div>
    </div>
    <div class="card">
      <strong>${summary.ordersThisWeek || 0}</strong>
      <div class="muted">Orders This Week</div>
      <div class="card-trend">
        <i class="fas fa-chart-line"></i> ${summary.orders7dAvg || 0}/day avg
      </div>
    </div>
    <div class="card">
      <strong>$${((summary.ordersThisWeek || 0) * 25).toLocaleString()}</strong>
      <div class="muted">Est. GMV (Week)</div>
      <div class="card-trend up">
        <i class="fas fa-dollar-sign"></i> $25 avg order
      </div>
    </div>
  `;
};

const renderAdminCharts = () => {
  // Orders trend chart
  const ordersCtx = document.getElementById('adminOrdersChart');
  if (ordersCtx) {
    if (ordersChart) ordersChart.destroy();
    
    const last7Days = [];
    const orderCounts = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      // Mock data - would come from API
      orderCounts.push(Math.floor(Math.random() * 50) + 10);
    }
    
    ordersChart = new Chart(ordersCtx, {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Orders',
          data: orderCounts,
          borderColor: 'rgba(255, 59, 48, 0.9)',
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#ff3b30',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 15, 15, 0.95)',
            titleColor: '#fff',
            bodyColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: 'rgba(255, 59, 48, 0.5)',
            borderWidth: 1,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: 'rgba(255, 255, 255, 0.6)' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          },
          x: {
            ticks: { color: 'rgba(255, 255, 255, 0.6)' },
            grid: { color: 'rgba(255, 255, 255, 0.04)' }
          }
        }
      }
    });
  }
  
  // Merchant distribution chart
  const merchantCtx = document.getElementById('adminMerchantChart');
  if (merchantCtx) {
    if (merchantChart) merchantChart.destroy();
    
    const statusCounts = {
      active: state.summary?.activeStores || 0,
      paused: state.summary?.pausedStores || 0,
      onboarding: state.summary?.onboardingStores || 0,
    };
    
    merchantChart = new Chart(merchantCtx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Paused', 'Onboarding'],
        datasets: [{
          data: [statusCounts.active || 10, statusCounts.paused || 2, statusCounts.onboarding || 3],
          backgroundColor: [
            'rgba(52, 199, 89, 0.8)',
            'rgba(255, 149, 0, 0.8)',
            'rgba(0, 122, 255, 0.8)',
          ],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              padding: 16,
              usePointStyle: true,
            }
          }
        }
      }
    });
  }
};

const renderAdminAttention = () => {
  const adminAttention = document.getElementById('adminAttention');
  if (!adminAttention) return;
  
  const attentionItems = [];
  
  // Check for flagged merchants
  if (state.summary?.flaggedStores > 0) {
    attentionItems.push({
      icon: 'fas fa-flag',
      iconClass: 'danger',
      title: `${state.summary.flaggedStores} Flagged Merchant${state.summary.flaggedStores > 1 ? 's' : ''}`,
      desc: 'Review flagged accounts for policy violations',
      action: 'Review',
      filter: { status: 'flagged' }
    });
  }
  
  // Check for pending orders
  if (state.summary?.newOrders > 5) {
    attentionItems.push({
      icon: 'fas fa-clock',
      iconClass: 'warning',
      title: `${state.summary.newOrders} Pending Orders`,
      desc: 'High volume of unprocessed orders',
      action: 'View Orders',
      view: 'orders'
    });
  }
  
  // Check for inactive merchants
  if (state.summary?.inactiveMerchants > 0) {
    attentionItems.push({
      icon: 'fas fa-user-clock',
      iconClass: 'info',
      title: `${state.summary.inactiveMerchants} Inactive Merchants`,
      desc: 'No activity in the last 7 days',
      action: 'View List',
      view: 'merchants'
    });
  }
  
  // Default message if nothing needs attention
  if (attentionItems.length === 0) {
    adminAttention.innerHTML = `
      <div class="attention-card">
        <div class="attention-icon" style="background: rgba(52, 199, 89, 0.15); color: #34c759;">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="attention-content">
          <div class="attention-title">All Clear</div>
          <div class="attention-desc">No items require immediate attention</div>
        </div>
      </div>
    `;
    return;
  }
  
  adminAttention.innerHTML = attentionItems.map(item => `
    <div class="attention-card">
      <div class="attention-icon ${item.iconClass}">
        <i class="${item.icon}"></i>
      </div>
      <div class="attention-content">
        <div class="attention-title">${item.title}</div>
        <div class="attention-desc">${item.desc}</div>
      </div>
      <button class="attention-action" data-view="${item.view || ''}" data-filter='${JSON.stringify(item.filter || {})}'>
        ${item.action}
      </button>
    </div>
  `).join('');
  
  // Add click handlers
  adminAttention.querySelectorAll('.attention-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) {
        setActiveView(view);
      }
    });
  });
};

const renderOpsPulse = () => {
  opsPulse.innerHTML = `
    <div class="list-item"><i class="fas fa-shopping-cart" style="color: var(--accent); margin-right: 8px;"></i><strong>${state.summary?.ordersToday || 0}</strong> orders so far today</div>
    <div class="list-item"><i class="fas fa-store" style="color: var(--accent); margin-right: 8px;"></i><strong>${state.merchants.total || 0}</strong> merchants onboarded</div>
    <div class="list-item"><i class="fas fa-hourglass-half" style="color: var(--accent); margin-right: 8px;"></i><strong>${state.summary?.newOrders || 0}</strong> orders pending</div>
    <div class="list-item"><i class="fas fa-user-plus" style="color: var(--accent); margin-right: 8px;"></i><strong>${state.summary?.newStoresThisWeek || 0}</strong> new signups this week</div>
  `;
};

const renderOverviewOrders = () => {
  if (!state.overviewOrders.length) {
    overviewOrders.innerHTML = '<div class="muted">No recent orders.</div>';
    return;
  }
  overviewOrders.innerHTML = state.overviewOrders
    .slice(0, 5)
    .map(
      (order) => `
      <div class="list-item">
        <strong>${order.request_id}</strong> · ${order.store_id}
        <div class="muted">${order.customer_name || ""} · ${Formatters.dateTime(
        order.created_at
      )}</div>
      </div>
    `
    )
    .join("");
};

const statusBadge = (status) => {
  const safe = status || "unknown";
  return `<span class="badge ${safe}">${safe}</span>`;
};

const renderMerchants = () => {
  if (!state.merchants.items.length) {
    merchantTableBody.innerHTML = `<tr><td colspan="9" class="muted">No merchants found.</td></tr>`;
    return;
  }
  merchantTableBody.innerHTML = state.merchants.items
    .map(
      (store) => `
    <tr data-store-id="${store.store_id}">
      <td><input type="checkbox" data-select="merchant" value="${store.store_id}" ${
        state.merchants.selected.has(store.store_id) ? "checked" : ""
      } /></td>
      <td>
        <div class="list-item">
          <strong>${store.name}</strong>
          <div class="muted">${store.profile_email || "—"}</div>
        </div>
      </td>
      <td>${store.store_id}</td>
      <td>${statusBadge(store.status)}</td>
      <td>${store.orders_today || 0} / ${store.orders_7d || 0}</td>
      <td>
        <div>${store.profile_completeness || 0}%</div>
        <div class="progress"><span class="progress-fill" data-progress="${store.profile_completeness || 0}"></span></div>
      </td>
      <td>${store.last_active ? Formatters.dateTime(store.last_active) : "—"}</td>
      <td>${store.whatsapp || "—"}</td>
      <td>
        <div class="panel-actions">
          <button class="btn ghost" data-action="view">View</button>
          <button class="btn ghost" data-action="reset">Reset</button>
          <button class="btn ghost" data-action="toggle">${
            store.status === "paused" ? "Activate" : "Pause"
          }</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  merchantTableBody.querySelectorAll(".progress-fill").forEach((el) => {
    const value = Number(el.dataset.progress || 0);
    el.style.width = `${Math.min(100, Math.max(0, value))}%`;
  });
  selectAllMerchants.checked =
    state.merchants.items.length > 0 &&
    state.merchants.items.every((store) => state.merchants.selected.has(store.store_id));
};

const renderMenuItems = () => {
  if (!state.menuItems.items.length) {
    menuTableBody.innerHTML = `<tr><td colspan="8" class="muted">No menu items found.</td></tr>`;
    return;
  }
  menuTableBody.innerHTML = state.menuItems.items
    .map(
      (item) => `
    <tr data-item-id="${item.item_id}" data-store-id="${item.store_id}">
      <td>
        <div class="list-item">
          <strong>${item.title}</strong>
          <div class="muted">${item.item_id}</div>
        </div>
      </td>
      <td>${item.store_id}</td>
      <td>${item.category || "—"}</td>
      <td>${statusBadge(item.status)}</td>
      <td>${Formatters.money(item.price || 0, "JMD")}</td>
      <td>${item.featured ? "Yes" : "No"}</td>
      <td>${item.image_url || item.video_url ? "✅" : "—"}</td>
      <td>
        <div class="panel-actions">
          <button class="btn ghost" data-action="toggle-featured">Toggle featured</button>
          <button class="btn ghost" data-action="toggle-status">Toggle status</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
};

const renderOrders = () => {
  if (!state.orders.items.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="8" class="muted">No orders found.</td></tr>`;
    return;
  }
  ordersTableBody.innerHTML = state.orders.items
    .map(
      (order) => `
    <tr data-request-id="${order.request_id}">
      <td>
        <strong>${order.request_id}</strong>
        <div class="muted">${Formatters.money(order.subtotal || 0, "JMD")}</div>
      </td>
      <td>${order.store_id}</td>
      <td>
        <div>${order.customer_name || "—"}</div>
        <div class="muted">${order.customer_phone || ""}</div>
      </td>
      <td>${order.fulfillment_type || "—"}</td>
      <td>${order.parish || "—"}</td>
      <td>${statusBadge(order.status)}</td>
      <td>${Formatters.dateTime(order.created_at)}</td>
      <td>
        <div class="panel-actions">
          <button class="btn ghost" data-action="view-order">View</button>
          <button class="btn ghost" data-action="mark-contacted">Contacted</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
};

const renderAnalytics = () => {
  analyticsCards.innerHTML = `
    <div class="card"><strong>${state.summary?.totalStores || 0}</strong><div class="muted">Active merchants</div></div>
    <div class="card"><strong>${state.summary?.ordersToday || 0}</strong><div class="muted">Orders today</div></div>
    <div class="card"><strong>${state.orders.total || 0}</strong><div class="muted">Orders in queue</div></div>
  `;
  topMerchants.innerHTML = state.analytics.topMerchants.length
    ? state.analytics.topMerchants
        .map(
          (merchant) => `
      <div class="list-item">
        <strong>${merchant.name}</strong>
        <div class="muted">${merchant.total_orders} orders in 7 days</div>
      </div>
    `
        )
        .join("")
    : '<div class="muted">No analytics yet.</div>';
  topItems.innerHTML = state.analytics.topItems.length
    ? state.analytics.topItems
        .map(
          (item) => `
      <div class="list-item">
        <strong>${item.title}</strong>
        <div class="muted">${item.total_requests} requests</div>
      </div>
    `
        )
        .join("")
    : '<div class="muted">No items ranked.</div>';
  deadMerchants.innerHTML = state.analytics.deadMerchants.length
    ? state.analytics.deadMerchants
        .map(
          (merchant) => `
      <div class="list-item">
        <strong>${merchant.name}</strong>
        <div class="muted">No orders in ${merchant.days} days</div>
      </div>
    `
        )
        .join("")
    : '<div class="muted">No inactive merchants detected.</div>';
};

const loadOverview = async () => {
  try {
    overviewCards.innerHTML = UI.skeleton(4);
    opsPulse.innerHTML = UI.skeleton(2);
    overviewOrders.innerHTML = UI.skeleton(2);
    const [summaryData, ordersData] = await Promise.all([
      Api.admin.summary(),
      Api.admin.orders({ limit: 5, offset: 0 }),
    ]);
    state.summary = summaryData.summary;
    state.overviewOrders = ordersData.orders;
    renderSummary();
    renderOpsPulse();
    renderOverviewOrders();
    renderAdminCharts();
    renderAdminAttention();
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

const loadMerchants = async () => {
  try {
    merchantTableBody.innerHTML = `<tr><td colspan="9">${UI.skeleton(3)}</td></tr>`;
    const data = await Api.admin.stores({
      q: state.merchants.q,
      status: state.merchants.status,
      parish: state.merchants.parish,
      limit: state.merchants.limit,
      offset: state.merchants.offset,
      sort: state.merchants.sort,
    });
    state.merchants.items = data.stores;
    state.merchants.total = data.total;
    renderMerchants();
    renderPagination(merchantPagination, state.merchants, () => {
      paginate(state.merchants, -1);
      loadMerchants();
    }, () => {
      paginate(state.merchants, 1);
      loadMerchants();
    });
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

const loadMenuItems = async () => {
  try {
    menuTableBody.innerHTML = `<tr><td colspan="8">${UI.skeleton(3)}</td></tr>`;
    const data = await Api.admin.menuItems({
      q: state.menuItems.q,
      storeId: state.menuItems.storeId,
      category: state.menuItems.category,
      status: state.menuItems.availability,
      featured: state.menuItems.featured,
      missingMedia: state.menuItems.missingMedia,
      limit: state.menuItems.limit,
      offset: state.menuItems.offset,
    });
    state.menuItems.items = data.items;
    state.menuItems.total = data.total;
    renderMenuItems();
    renderPagination(menuPagination, state.menuItems, () => {
      paginate(state.menuItems, -1);
      loadMenuItems();
    }, () => {
      paginate(state.menuItems, 1);
      loadMenuItems();
    });
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

const loadOrders = async () => {
  try {
    ordersTableBody.innerHTML = `<tr><td colspan="8">${UI.skeleton(3)}</td></tr>`;
    const data = await Api.admin.orders({
      q: state.orders.q,
      storeId: state.orders.storeId,
      status: state.orders.status,
      from: state.orders.from,
      to: state.orders.to,
      limit: state.orders.limit,
      offset: state.orders.offset,
    });
    state.orders.items = data.orders;
    state.orders.total = data.total;
    renderOrders();
    renderPagination(ordersPagination, state.orders, () => {
      paginate(state.orders, -1);
      loadOrders();
    }, () => {
      paginate(state.orders, 1);
      loadOrders();
    });
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

const loadAnalytics = async () => {
  try {
    const data = await Api.admin.analytics();
    state.analytics = data.analytics;
    renderAnalytics();
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

const openDrawer = (content) => {
  drawerContent.innerHTML = content;
  drawer.classList.add("open");
};

const closeDrawer = () => {
  drawer.classList.remove("open");
  drawerContent.innerHTML = "";
};

drawer.addEventListener("click", (event) => {
  if (event.target === drawer) {
    closeDrawer();
  }
});

const openMerchantDrawer = async (storeId) => {
  try {
    drawerContent.innerHTML = UI.skeleton(3);
    drawer.classList.add("open");
    const data = await Api.admin.storeDetail(storeId);
    const store = data.store;
    const menuItems = data.menuItems || [];
    const orders = data.orders || [];
    const analytics = data.analytics || {};
    const completenessChecks = [
      { key: "logo_url", label: "Logo uploaded" },
      { key: "hours", label: "Hours configured" },
      { key: "about", label: "About description" },
      { key: "whatsapp", label: "WhatsApp connected" },
      { key: "business_address", label: "Business address" },
    ];
    const checklist = completenessChecks
      .map(
        (check) => `
        <div class="list-item">${store[check.key] ? "✅" : "⚠️"} ${check.label}</div>
      `
      )
      .join("");

    openDrawer(`
      <div class="drawer-header">
        <div>
          <h2>${store.name}</h2>
          <div class="muted">${store.store_id} · ${store.status}</div>
        </div>
        <button class="icon-btn" data-action="close">✕</button>
      </div>
      <div class="panel-actions mt-12">
        <button class="btn ghost" data-action="open-storefront" data-store="${store.store_id}">Open Storefront</button>
        <button class="btn ghost" data-action="copy-link" data-store="${store.store_id}">Copy Store Link</button>
        <button class="btn ghost" data-action="reset-passcode" data-store="${store.store_id}">Reset Passcode</button>
        <button class="btn ghost" data-action="toggle-status" data-store="${store.store_id}">${
          store.status === "paused" ? "Activate" : "Pause"
        }</button>
      </div>
      <div class="drawer-tabs">
        <button class="drawer-tab active" data-tab="profile">Profile</button>
        <button class="drawer-tab" data-tab="menu">Menu</button>
        <button class="drawer-tab" data-tab="orders">Orders</button>
        <button class="drawer-tab" data-tab="performance">Performance</button>
        <button class="drawer-tab" data-tab="activity">Activity Log</button>
      </div>
      <div class="drawer-section active" data-section="profile">
        <div class="form-grid">
          <label class="field">
            <span>Name</span>
            <input data-field="name" value="${store.name || ""}" />
          </label>
          <label class="field">
            <span>Logo URL</span>
            <input data-field="logo_url" value="${store.logo_url || ""}" />
          </label>
          <label class="field">
            <span>WhatsApp</span>
            <input data-field="whatsapp" value="${store.whatsapp || ""}" />
          </label>
          <label class="field">
            <span>Profile email</span>
            <input data-field="profile_email" value="${store.profile_email || ""}" />
          </label>
          <label class="field">
            <span>Status</span>
            <select data-field="status">
              <option value="active" ${store.status === "active" ? "selected" : ""}>Active</option>
              <option value="paused" ${store.status === "paused" ? "selected" : ""}>Paused</option>
              <option value="onboarding" ${store.status === "onboarding" ? "selected" : ""}>Onboarding</option>
              <option value="flagged" ${store.status === "flagged" ? "selected" : ""}>Flagged</option>
            </select>
          </label>
          <label class="field">
            <span>Owner name (internal)</span>
            <input data-field="owner_name" value="${store.owner_name || ""}" />
          </label>
          <label class="field">
            <span>Owner phone (internal)</span>
            <input data-field="owner_phone" value="${store.owner_phone || ""}" />
          </label>
          <label class="field">
            <span>Owner email (internal)</span>
            <input data-field="owner_email" value="${store.owner_email || ""}" />
          </label>
          <label class="field">
            <span>Hours</span>
            <input data-field="hours" value="${store.hours || ""}" />
          </label>
          <label class="field full">
            <span>About</span>
            <textarea data-field="about" rows="3">${store.about || ""}</textarea>
          </label>
        </div>
        <button class="btn primary mt-16" data-action="save-profile" data-store="${store.store_id}">Save profile</button>
        <div class="panel mt-16">
          <h3>Profile completeness</h3>
          <div class="list">
            ${checklist || '<div class="muted">All essentials captured.</div>'}
          </div>
        </div>
      </div>
      <div class="drawer-section" data-section="menu">
        <div class="list">
          ${
            menuItems.length
              ? menuItems
                  .map(
                    (item) => `
                <div class="panel mt-12" data-item-id="${item.item_id}">
                  <div class="panel-header">
                    <div>
                      <strong>${item.title}</strong>
                      <div class="muted">${item.item_id} · ${item.category || "—"}</div>
                    </div>
                    ${
                      item.image_url || item.video_url
                        ? `<img class="thumb" src="${item.image_url || item.video_url}" alt="${item.title}" />`
                        : `<div class="badge">No media</div>`
                    }
                  </div>
                  <div class="form-grid mt-12">
                    <label class="field">
                      <span>Title</span>
                      <input data-field="title" data-item="${item.item_id}" value="${item.title}" />
                    </label>
                    <label class="field">
                      <span>Price</span>
                      <input data-field="price" data-item="${item.item_id}" value="${item.price || ""}" />
                    </label>
                    <label class="field">
                      <span>Category</span>
                      <input data-field="category" data-item="${item.item_id}" value="${item.category || ""}" />
                    </label>
                    <label class="field">
                      <span>Status</span>
                      <select data-field="status" data-item="${item.item_id}">
                        <option value="available" ${item.status === "available" ? "selected" : ""}>Available</option>
                        <option value="limited" ${item.status === "limited" ? "selected" : ""}>Limited</option>
                        <option value="unavailable" ${item.status === "unavailable" ? "selected" : ""}>Unavailable</option>
                      </select>
                    </label>
                    <label class="checkbox">
                      <input type="checkbox" data-field="featured" data-item="${item.item_id}" ${
                        item.featured ? "checked" : ""
                      } />\n                      <span>Featured</span>
                    </label>
                  </div>
                  <button class="btn ghost mt-12" data-action="save-menu-item" data-item="${item.item_id}" data-store="${
                      item.store_id
                    }">Save</button>
                </div>
              `
                  )
                  .join("")
              : '<div class="muted">No menu items found.</div>'
          }
        </div>
      </div>
      <div class="drawer-section" data-section="orders">
        <div class="list">
          ${
            orders.length
              ? orders
                  .map(
                    (order) => `
                <div class="list-item">
                  <strong>${order.request_id}</strong>
                  <div class="muted">${order.customer_name || ""} · ${Formatters.dateTime(
                      order.created_at
                    )}</div>
                </div>
              `
                  )
                  .join("")
              : '<div class="muted">No orders yet.</div>'
          }
        </div>
      </div>
      <div class="drawer-section" data-section="performance">
        <div class="grid-3">
          <div class="card"><strong>${analytics.ordersToday || 0}</strong><div class="muted">Orders today</div></div>
          <div class="card"><strong>${analytics.totalOrders || 0}</strong><div class="muted">Total orders</div></div>
          <div class="card"><strong>${analytics.totalItems || 0}</strong><div class="muted">Menu items</div></div>
        </div>
        <div class="list mt-12">
          <div class="list-item">Top item: ${analytics.topItem?.title || "—"}</div>
          <div class="list-item">Top category: ${analytics.topCategory || "—"}</div>
        </div>
      </div>
      <div class="drawer-section" data-section="activity">
        <div class="muted">Admin actions will appear here.</div>
      </div>
    `);
    drawerContent.dataset.storeStatus = store.status;
    drawerContent.dataset.storeId = store.store_id;
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

const openOrderDrawer = (order) => {
  const items = Array.isArray(order.items_json) ? order.items_json : [];
  const itemList = items
    .map(
      (item) => `
      <div class="list-item">
        <strong>${item.title || "Item"}</strong>
        <div class="muted">${item.qty || 1} × ${Formatters.money(item.price || 0, "JMD")}</div>
      </div>
    `
    )
    .join("");
  const message = `Order ${order.request_id}\nCustomer: ${order.customer_name}\nItems: ${items
    .map((item) => `${item.qty || 1}x ${item.title || "Item"}`)
    .join(", ")}`;
  const whatsappUrl = order.store_whatsapp
    ? `https://wa.me/${order.store_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        message
      )}`
    : null;
  openDrawer(`
    <div class="drawer-header">
      <div>
        <h2>${order.request_id}</h2>
        <div class="muted">${order.store_id} · ${order.status}</div>
      </div>
      <button class="icon-btn" data-action="close">✕</button>
    </div>
    <div class="panel mt-16">
      <h3>Customer</h3>
      <div class="list-item">${order.customer_name || "—"}</div>
      <div class="list-item">${order.customer_phone || "—"}</div>
      <div class="list-item">${order.customer_email || "—"}</div>
    </div>
    <div class="panel mt-16">
      <h3>Order items</h3>
      ${itemList || '<div class="muted">No items listed.</div>'}
    </div>
    <div class="panel mt-16">
      <h3>Delivery</h3>
      <div class="list-item">${order.fulfillment_type || "—"}</div>
      <div class="list-item">${order.parish || "—"}</div>
      <div class="list-item">${order.delivery_address || "—"}</div>
    </div>
    <div class="panel-actions mt-16">
      ${
        whatsappUrl
          ? `<a class="btn primary" href="${whatsappUrl}" target="_blank" rel="noopener">Message merchant</a>`
          : '<div class="muted">No merchant WhatsApp on file.</div>'
      }
    </div>
  `);
};

const setGlobalSearch = (value) => {
  if (state.view === "merchants") {
    state.merchants.q = value;
    state.merchants.offset = 0;
    loadMerchants();
  }
  if (state.view === "orders") {
    state.orders.q = value;
    state.orders.offset = 0;
    loadOrders();
  }
  if (state.view === "menu") {
    state.menuItems.q = value;
    state.menuItems.offset = 0;
    loadMenuItems();
  }
};

let searchTimer;

document.getElementById("globalSearch").addEventListener("input", (event) => {
  clearTimeout(searchTimer);
  const value = event.target.value.trim();
  searchTimer = setTimeout(() => setGlobalSearch(value), 400);
});

filterRow.addEventListener("click", (event) => {
  if (!event.target.classList.contains("chip")) return;
  filterRow.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
  event.target.classList.add("active");
  const filter = JSON.parse(event.target.dataset.filter);
  state.merchants.status = filter.status || "";
  state.merchants.sort = filter.sort || "newest";
  merchantStatusFilter.value = state.merchants.status;
  merchantSort.value = state.merchants.sort;
  state.merchants.offset = 0;
  loadMerchants();
});

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.view);
    if (item.dataset.view === "overview") loadOverview();
    if (item.dataset.view === "merchants") loadMerchants();
    if (item.dataset.view === "orders") loadOrders();
    if (item.dataset.view === "menu") loadMenuItems();
    if (item.dataset.view === "analytics") loadAnalytics();
  });
});

document.getElementById("adminLoginBtn").addEventListener("click", async () => {
  try {
    const data = await Api.admin.login({
      username: document.getElementById("adminUser").value.trim(),
      password: document.getElementById("adminPass").value.trim(),
    });
    localStorage.setItem("admin_token", data.token);
    loginView.classList.add("hidden");
    adminShell.classList.remove("hidden");
    await loadOverview();
    await loadMerchants();
  } catch (error) {
    UI.toast(error.message, "error");
  }
});

document.getElementById("adminLogout").addEventListener("click", () => {
  resetToLogin();
});

merchantStatusFilter.addEventListener("change", () => {
  state.merchants.status = merchantStatusFilter.value;
  state.merchants.offset = 0;
  loadMerchants();
});

merchantParishFilter.addEventListener("input", (event) => {
  state.merchants.parish = event.target.value.trim();
  state.merchants.offset = 0;
  loadMerchants();
});

merchantSort.addEventListener("change", () => {
  state.merchants.sort = merchantSort.value;
  state.merchants.offset = 0;
  loadMerchants();
});

selectAllMerchants.addEventListener("change", (event) => {
  state.merchants.selected.clear();
  if (event.target.checked) {
    state.merchants.items.forEach((store) => state.merchants.selected.add(store.store_id));
  }
  renderMerchants();
});

merchantTableBody.addEventListener("change", (event) => {
  if (event.target.dataset.select !== "merchant") return;
  if (event.target.checked) {
    state.merchants.selected.add(event.target.value);
  } else {
    state.merchants.selected.delete(event.target.value);
  }
});

const runBulkAction = async (action) => {
  const storeIds = Array.from(state.merchants.selected);
  if (!storeIds.length) {
    UI.toast("Select merchants first", "error");
    return;
  }
  try {
    if (action === "reset") {
      await Api.admin.bulkResetPasscodes({ store_ids: storeIds });
      UI.toast("Passcodes reset", "success");
    } else {
      await Api.admin.bulkUpdateStores({ store_ids: storeIds, action });
      UI.toast("Merchants updated", "success");
    }
    state.merchants.selected.clear();
    selectAllMerchants.checked = false;
    loadMerchants();
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
};

bulkActivateBtn.addEventListener("click", () => runBulkAction("activate"));
bulkPauseBtn.addEventListener("click", () => runBulkAction("pause"));
bulkResetBtn.addEventListener("click", () => runBulkAction("reset"));
bulkExportBtn.addEventListener("click", () => {
  const rows = state.merchants.items.filter((store) =>
    state.merchants.selected.has(store.store_id)
  );
  if (!rows.length) {
    UI.toast("Select merchants to export", "error");
    return;
  }
  const headers = ["name", "store_id", "status", "whatsapp", "profile_email"];
  const csv = [headers.join(",")]
    .concat(
      rows.map((row) =>
        headers.map((header) => `"${String(row[header] ?? "").replace(/\"/g, '\"\"')}"`).join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `clickmenu-merchants-selected-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

merchantTableBody.addEventListener("click", async (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  const storeId = row.dataset.storeId;
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === "view") {
    openMerchantDrawer(storeId);
  }
  if (action === "reset") {
    try {
      const data = await Api.admin.resetPasscode({ storeId });
      UI.toast(`New passcode: ${data.password}`, "success");
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
  if (action === "toggle") {
    try {
      const next = row.querySelector(".badge")?.textContent === "paused" ? "activate" : "pause";
      await Api.admin.bulkUpdateStores({ store_ids: [storeId], action: next });
      UI.toast("Status updated", "success");
      loadMerchants();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
});

menuStoreFilter.addEventListener("input", (event) => {
  state.menuItems.storeId = event.target.value.trim();
  state.menuItems.offset = 0;
  loadMenuItems();
});

menuCategoryFilter.addEventListener("input", (event) => {
  state.menuItems.category = event.target.value.trim();
  state.menuItems.offset = 0;
  loadMenuItems();
});

menuAvailabilityFilter.addEventListener("change", () => {
  state.menuItems.availability = menuAvailabilityFilter.value;
  state.menuItems.offset = 0;
  loadMenuItems();
});

menuFeaturedFilter.addEventListener("change", () => {
  state.menuItems.featured = menuFeaturedFilter.value;
  state.menuItems.offset = 0;
  loadMenuItems();
});

menuMissingMedia.addEventListener("change", () => {
  state.menuItems.missingMedia = menuMissingMedia.checked;
  state.menuItems.offset = 0;
  loadMenuItems();
});

menuTableBody.addEventListener("click", async (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  const action = event.target.dataset.action;
  if (!action) return;
  const storeId = row.dataset.storeId;
  const itemId = row.dataset.itemId;
  const item = state.menuItems.items.find(
    (entry) => entry.item_id === itemId && entry.store_id === storeId
  );
  if (!item) return;
  if (action === "toggle-featured") {
    try {
      await Api.admin.updateMenuItem(itemId, {
        store_id: storeId,
        featured: !item.featured,
      });
      UI.toast("Item updated", "success");
      loadMenuItems();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
  if (action === "toggle-status") {
    const nextStatus = item.status === "available" ? "unavailable" : "available";
    try {
      await Api.admin.updateMenuItem(itemId, {
        store_id: storeId,
        status: nextStatus,
      });
      UI.toast("Item updated", "success");
      loadMenuItems();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
});

ordersStoreFilter.addEventListener("input", (event) => {
  state.orders.storeId = event.target.value.trim();
  state.orders.offset = 0;
  loadOrders();
});

ordersStatusFilter.addEventListener("change", () => {
  state.orders.status = ordersStatusFilter.value;
  state.orders.offset = 0;
  loadOrders();
});

ordersFrom.addEventListener("change", () => {
  state.orders.from = ordersFrom.value;
  state.orders.offset = 0;
  loadOrders();
});

ordersTo.addEventListener("change", () => {
  state.orders.to = ordersTo.value;
  state.orders.offset = 0;
  loadOrders();
});

ordersTableBody.addEventListener("click", async (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  const requestId = row.dataset.requestId;
  const action = event.target.dataset.action;
  const order = state.orders.items.find((item) => item.request_id === requestId);
  if (!order) return;
  if (action === "view-order") {
    openOrderDrawer(order);
  }
  if (action === "mark-contacted") {
    try {
      await Api.admin.updateOrderStatus(requestId, { status: "contacted" });
      UI.toast("Order updated", "success");
      loadOrders();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
});

const closeModal = () => {
  modal.classList.remove("open");
};

const openModal = () => {
  modal.classList.add("open");
};

document.getElementById("createMerchantBtn").addEventListener("click", openModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

const gatherCreateStorePayload = () => ({
  store_id: document.getElementById("createStoreId").value.trim(),
  name: document.getElementById("createStoreName").value.trim(),
  whatsapp: document.getElementById("createStoreWhatsapp").value.trim(),
  profile_email: document.getElementById("createStoreEmail").value.trim(),
  logo_url: document.getElementById("createStoreLogo").value.trim(),
  status: document.getElementById("createStoreStatus").value,
  password: document.getElementById("createStorePasscode").value.trim() || undefined,
  business_address: document.getElementById("createStoreAddress").value.trim(),
  parish: document.getElementById("createStoreParish").value.trim(),
  owner_name: document.getElementById("createOwnerName").value.trim(),
  owner_phone: document.getElementById("createOwnerPhone").value.trim(),
  owner_email: document.getElementById("createOwnerEmail").value.trim(),
  hours: document.getElementById("createStoreHours").value.trim(),
  about: document.getElementById("createStoreAbout").value.trim(),
});

document.getElementById("submitCreateStore").addEventListener("click", async () => {
  try {
    const payload = gatherCreateStorePayload();
    if (!payload.store_id || !payload.name) {
      UI.toast("Store ID and name are required", "error");
      return;
    }
    await Api.admin.createStore(payload);
    UI.toast("Merchant created", "success");
    closeModal();
    loadMerchants();
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

const exportCsv = () => {
  let rows = [];
  if (state.view === "merchants") {
    rows = state.merchants.items.map((store) => ({
      name: store.name,
      store_id: store.store_id,
      status: store.status,
      whatsapp: store.whatsapp,
      profile_email: store.profile_email,
    }));
  }
  if (state.view === "orders") {
    rows = state.orders.items.map((order) => ({
      request_id: order.request_id,
      store_id: order.store_id,
      status: order.status,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
    }));
  }
  if (state.view === "menu") {
    rows = state.menuItems.items.map((item) => ({
      item_id: item.item_id,
      title: item.title,
      store_id: item.store_id,
      status: item.status,
      price: item.price,
    }));
  }
  if (!rows.length) {
    UI.toast("No data to export", "error");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(
      rows.map((row) =>
        headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `clickmenu-${state.view}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);

drawerContent.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  if (action === "close") {
    closeDrawer();
  }
  if (action === "copy-link") {
    const storeId = event.target.dataset.store;
    const link = `${window.location.origin}/storefront?store=${storeId}`;
    await navigator.clipboard.writeText(link);
    UI.toast("Store link copied", "success");
  }
  if (action === "open-storefront") {
    const storeId = event.target.dataset.store;
    window.open(`/storefront?store=${storeId}`, "_blank");
  }
  if (action === "reset-passcode") {
    const storeId = event.target.dataset.store;
    try {
      const data = await Api.admin.resetPasscode({ storeId });
      UI.toast(`New passcode: ${data.password}`, "success");
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
  if (action === "toggle-status") {
    const storeId = event.target.dataset.store;
    const isPaused = drawerContent.dataset.storeStatus === "paused";
    try {
      await Api.admin.bulkUpdateStores({
        store_ids: [storeId],
        action: isPaused ? "activate" : "pause",
      });
      UI.toast("Status updated", "success");
      closeDrawer();
      loadMerchants();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
  if (action === "save-profile") {
    const storeId = event.target.dataset.store;
    const payload = {};
    drawerContent.querySelectorAll("[data-field]").forEach((input) => {
      payload[input.dataset.field] = input.value.trim();
    });
    try {
      await Api.admin.updateStore(storeId, payload);
      UI.toast("Profile updated", "success");
      loadMerchants();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
  if (action === "save-menu-item") {
    const itemId = event.target.dataset.item;
    const storeId = event.target.dataset.store || drawerContent.dataset.storeId;
    const payload = { store_id: storeId };
    drawerContent.querySelectorAll(`[data-item="${itemId}"][data-field]`).forEach((input) => {
      if (input.type === "checkbox") {
        payload[input.dataset.field] = input.checked;
      } else {
        payload[input.dataset.field] = input.value;
      }
    });
    if (payload.price) {
      payload.price = Number(payload.price);
    }
    try {
      await Api.admin.updateMenuItem(itemId, payload);
      UI.toast("Menu item updated", "success");
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
});

drawerContent.addEventListener("click", (event) => {
  if (!event.target.classList.contains("drawer-tab")) return;
  const tab = event.target.dataset.tab;
  drawerContent.querySelectorAll(".drawer-tab").forEach((item) => {
    item.classList.toggle("active", item.dataset.tab === tab);
  });
  drawerContent.querySelectorAll(".drawer-section").forEach((section) => {
    section.classList.toggle("active", section.dataset.section === tab);
  });
});

const boot = async () => {
  if (localStorage.getItem("admin_token")) {
    loginView.classList.add("hidden");
    adminShell.classList.remove("hidden");
    await loadOverview();
    await loadMerchants();
  }
};

boot();
