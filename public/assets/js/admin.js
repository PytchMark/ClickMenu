const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const summaryRow = document.getElementById("summaryRow");
const storesList = document.getElementById("storesList");
const ordersList = document.getElementById("ordersList");
const resetResult = document.getElementById("resetResult");
const menuList = document.getElementById("menuList");
const menuStoreFilter = document.getElementById("menuStoreFilter");
const loadMenuBtn = document.getElementById("loadMenuBtn");

const state = {
  stores: [],
  orders: [],
  summary: null,
};

const isAuthError = (error) =>
  error && ["Invalid token", "Missing token", "Forbidden"].includes(error.message);

const resetToLogin = () => {
  localStorage.removeItem("admin_token");
  dashboardView.style.display = "none";
  loginView.style.display = "flex";
};

const handleAuthError = (error) => {
  if (isAuthError(error)) {
    resetToLogin();
    return true;
  }
  return false;
};

const renderSummary = () => {
  if (!state.summary) return;
  summaryRow.innerHTML = `
    <div class="card"><strong>${state.summary.totalStores}</strong><div>Total stores</div></div>
    <div class="card"><strong>${state.summary.ordersToday}</strong><div>Orders today</div></div>
    <div class="card"><strong>${state.summary.newOrders}</strong><div>New orders</div></div>
  `;
};

const renderStores = () => {
  storesList.innerHTML = state.stores
    .map(
      (store) => `
    <div class="list-item">
      <strong>${store.name}</strong> · ${store.store_id} · ${store.status}
      <div>${store.profile_email || ""}</div>
      <button class="btn" data-edit-store="${store.store_id}" style="margin-top:8px;">Edit</button>
    </div>
  `
    )
    .join("");
};

const renderOrders = () => {
  ordersList.innerHTML = state.orders
    .map(
      (order) => `
    <div class="list-item">
      <strong>${order.request_id}</strong> · ${order.store_id}
      <div>${order.customer_name} · ${Formatters.dateTime(order.created_at)}</div>
      <div>${order.status}</div>
      <select data-order-status="${order.request_id}">
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="confirmed">Confirmed</option>
        <option value="closed">Closed</option>
        <option value="canceled">Canceled</option>
      </select>
    </div>
  `
    )
    .join("");
  ordersList.querySelectorAll("select").forEach((select) => {
    const order = state.orders.find((entry) => entry.request_id === select.dataset.orderStatus);
    if (order) select.value = order.status;
  });
};

const renderMenu = (items = []) => {
  menuList.innerHTML = items
    .map(
      (item) => `
    <div class="list-item">
      <strong>${item.title}</strong> · ${item.item_id} · ${item.store_id}
      <div>${item.status} · ${item.category}</div>
      <button class="btn" data-hide-item="${item.item_id}" data-store="${item.store_id}" style="margin-top:8px;">Hide</button>
    </div>
  `
    )
    .join("");
};

const loadAdminData = async () => {
  const summaryData = await Api.admin.summary();
  const storesData = await Api.admin.stores();
  const ordersData = await Api.admin.orders();
  state.summary = summaryData.summary;
  state.stores = storesData.stores;
  state.orders = ordersData.orders;
  renderSummary();
  renderStores();
  renderOrders();
};

document.getElementById("adminLoginBtn").addEventListener("click", async () => {
  try {
    const data = await Api.admin.login({
      username: document.getElementById("adminUser").value.trim(),
      password: document.getElementById("adminPass").value.trim(),
    });
    localStorage.setItem("admin_token", data.token);
    loginView.style.display = "none";
    dashboardView.style.display = "block";
    await loadAdminData();
  } catch (error) {
    UI.toast(error.message, "error");
  }
});

document.getElementById("adminLogout").addEventListener("click", () => {
  resetToLogin();
});

document.getElementById("createStoreBtn").addEventListener("click", async () => {
  try {
    const payload = {
      store_id: document.getElementById("storeId").value.trim(),
      name: document.getElementById("storeName").value.trim(),
      whatsapp: document.getElementById("storeWhatsapp").value.trim(),
      profile_email: document.getElementById("storeEmail").value.trim(),
      logo_url: document.getElementById("storeLogo").value.trim(),
      password: document.getElementById("storePasscode").value.trim(),
      business_address: document.getElementById("storeAddress").value.trim(),
      parish: document.getElementById("storeParish").value.trim(),
      owner_name: document.getElementById("storeOwnerName").value.trim(),
      owner_phone: document.getElementById("storeOwnerPhone").value.trim(),
      owner_email: document.getElementById("storeOwnerEmail").value.trim(),
      hours: document.getElementById("storeHours").value.trim(),
      about: document.getElementById("storeAbout").value.trim(),
      status: document.getElementById("storeStatus").value,
    };
    const data = await Api.admin.createStore(payload);
    const existingIndex = state.stores.findIndex(
      (store) => store.store_id === data.store.store_id
    );
    if (existingIndex >= 0) {
      state.stores[existingIndex] = data.store;
    } else {
      state.stores.unshift(data.store);
    }
    renderStores();
    UI.toast("Store created", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

document.getElementById("resetPassBtn").addEventListener("click", async () => {
  const storeId = document.getElementById("resetStoreId").value.trim();
  if (!storeId) {
    UI.toast("Enter a store ID", "error");
    return;
  }
  try {
    const data = await Api.admin.resetPasscode({ storeId });
    resetResult.textContent = `New passcode: ${data.password}`;
    UI.toast("Passcode reset", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

storesList.addEventListener("click", (event) => {
  const storeId = event.target.dataset.editStore;
  if (!storeId) return;
  const store = state.stores.find((entry) => entry.store_id === storeId);
  if (!store) return;
  document.getElementById("storeId").value = store.store_id || "";
  document.getElementById("storeName").value = store.name || "";
  document.getElementById("storeWhatsapp").value = store.whatsapp || "";
  document.getElementById("storeEmail").value = store.profile_email || "";
  document.getElementById("storeLogo").value = store.logo_url || "";
  document.getElementById("storeStatus").value = store.status || "active";
  document.getElementById("storeAddress").value = store.business_address || "";
  document.getElementById("storeParish").value = store.parish || "";
  document.getElementById("storeOwnerName").value = store.owner_name || "";
  document.getElementById("storeOwnerPhone").value = store.owner_phone || "";
  document.getElementById("storeOwnerEmail").value = store.owner_email || "";
  document.getElementById("storeHours").value = store.hours || "";
  document.getElementById("storeAbout").value = store.about || "";
});

ordersList.addEventListener("change", async (event) => {
  const requestId = event.target.dataset.orderStatus;
  if (!requestId) return;
  try {
    const data = await Api.admin.updateOrderStatus(requestId, { status: event.target.value });
    const orderIndex = state.orders.findIndex(
      (order) => order.request_id === data.order.request_id
    );
    if (orderIndex >= 0) {
      state.orders[orderIndex] = data.order;
    }
    UI.toast("Order status updated", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

loadMenuBtn.addEventListener("click", async () => {
  try {
    const data = await Api.admin.menu(menuStoreFilter.value.trim());
    renderMenu(data.items || []);
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

menuList.addEventListener("click", async (event) => {
  const itemId = event.target.dataset.hideItem;
  const storeId = event.target.dataset.store;
  if (!itemId || !storeId) return;
  try {
    await Api.admin.deleteMenuItem(itemId, { storeId });
    const data = await Api.admin.menu(menuStoreFilter.value.trim());
    renderMenu(data.items || []);
    UI.toast("Item hidden", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

const boot = async () => {
  if (localStorage.getItem("admin_token")) {
    loginView.style.display = "none";
    dashboardView.style.display = "block";
    try {
      await loadAdminData();
    } catch (error) {
      handleAuthError(error);
    }
  }
};

boot();
