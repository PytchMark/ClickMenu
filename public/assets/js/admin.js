const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const summaryRow = document.getElementById("summaryRow");
const storesList = document.getElementById("storesList");
const ordersList = document.getElementById("ordersList");
const resetResult = document.getElementById("resetResult");

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
      status: document.getElementById("storeStatus").value,
    };
    const data = await Api.admin.createStore(payload);
    state.stores.unshift(data.store);
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
    const data = await Api.admin.resetPassword({ storeId });
    resetResult.textContent = `New passcode: ${data.password}`;
    UI.toast("Passcode reset", "success");
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
