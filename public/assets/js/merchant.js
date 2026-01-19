const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const storeName = document.getElementById("storeName");
const storeStatus = document.getElementById("storeStatus");
const storeLogo = document.getElementById("storeLogo");
const itemsList = document.getElementById("itemsList");
const ordersPanel = document.getElementById("ordersPanel");
const kpiRow = document.getElementById("kpiRow");
const profileWarning = document.getElementById("profileWarning");
const profilePanel = document.getElementById("profilePanel");
const mediaPreview = document.getElementById("mediaPreview");
const profilePreview = document.getElementById("profilePreview");

const state = {
  profile: null,
  items: [],
  orders: [],
  analytics: null,
};

const isAuthError = (error) =>
  error && ["Invalid token", "Missing token", "Forbidden"].includes(error.message);

const resetToLogin = () => {
  localStorage.removeItem("merchant_token");
  loginView.style.display = "flex";
  dashboardView.style.display = "none";
};

const handleAuthError = (error) => {
  if (isAuthError(error)) {
    resetToLogin();
    return true;
  }
  return false;
};

const renderKpis = () => {
  if (!state.analytics) return;
  kpiRow.innerHTML = `
    <div class="kpi"><strong>${state.analytics.totalOrders || 0}</strong><div>Total Requests</div></div>
    <div class="kpi"><strong>${state.analytics.ordersToday || 0}</strong><div>Orders Today</div></div>
    <div class="kpi"><strong>${state.analytics.topItem?.title || "—"}</strong><div>Top Item</div></div>
    <div class="kpi"><strong>${state.analytics.totalItems || 0}</strong><div>Total Menu Items</div></div>
  `;
};

const renderItemsList = () => {
  itemsList.innerHTML = state.items
    .map(
      (item) => `
    <div class="item-row">
      <div>
        <strong>${item.title}</strong>
        <div>${item.item_id} · ${item.status} · ${item.category}</div>
      </div>
      <button class="btn" data-edit="${item.item_id}">Edit</button>
    </div>
  `
    )
    .join("");
};

const renderOrders = () => {
  ordersPanel.innerHTML = state.orders
    .map(
      (order) => `
    <div class="order-card">
      <strong>${order.request_id}</strong> · ${order.customer_name}
      <div>${Formatters.dateTime(order.created_at)}</div>
      <div>${order.customer_phone}</div>
      <div>Fulfillment: ${order.fulfillment_type || "pickup"} · ${order.parish || "—"}</div>
      <div>Status: ${order.status}</div>
      <div style="margin:10px 0;">
        ${(order.items_json || [])
          .map((item) => `<div>${item.qty}x ${item.title}</div>`)
          .join("")}
      </div>
      <select data-status="${order.request_id}">
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
  ordersPanel.querySelectorAll("select").forEach((select) => {
    const order = state.orders.find((o) => o.request_id === select.dataset.status);
    if (order) select.value = order.status;
  });
};

const setProfileForm = () => {
  if (!state.profile) return;
  document.getElementById("businessAddress").value = state.profile.business_address || "";
  document.getElementById("businessParish").value = state.profile.parish || "";
  document.getElementById("ownerName").value = state.profile.owner_name || "";
  document.getElementById("ownerPhone").value = state.profile.owner_phone || "";
  document.getElementById("ownerEmail").value = state.profile.owner_email || "";
  document.getElementById("businessHours").value = state.profile.hours || "";
  document.getElementById("businessAbout").value = state.profile.about || "";
  document.getElementById("instagramHandle").value = state.profile.instagram || "";
  document.getElementById("tiktokHandle").value = state.profile.tiktok || "";
  renderProfilePreview();
};

const renderProfilePreview = () => {
  profilePreview.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;">
      <img src="${state.profile?.logo_url || "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=120&q=80"}" alt="logo" style="width:60px;height:60px;border-radius:12px;object-fit:cover;" />
      <div>
        <strong>${state.profile?.name || "Store Name"}</strong>
        <div>${state.profile?.about || "Tell customers about your story."}</div>
        <div>${state.profile?.hours || "Hours not set"}</div>
      </div>
    </div>
  `;
};

const loadDashboard = async () => {
  const profileData = await Api.merchant.me();
  state.profile = profileData.profile;
  storeName.textContent = state.profile.name;
  storeStatus.textContent = `Status: ${state.profile.status}`;
  storeLogo.src =
    state.profile.logo_url ||
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=160&q=80";
  profileWarning.style.display = state.profile.authorized ? "none" : "block";
  setProfileForm();
  const itemsData = await Api.merchant.menu();
  state.items = itemsData.items || [];
  const ordersData = await Api.merchant.orders();
  state.orders = ordersData.orders || [];
  const analyticsData = await Api.merchant.analytics();
  state.analytics = analyticsData.analytics;
  renderItemsList();
  renderOrders();
  renderKpis();
};

document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    const data = await Api.merchant.login({
      storeIdOrEmail: document.getElementById("loginId").value.trim(),
      password: document.getElementById("loginPass").value.trim(),
    });
    localStorage.setItem("merchant_token", data.token);
    loginView.style.display = "none";
    dashboardView.style.display = "block";
    await loadDashboard();
  } catch (error) {
    UI.toast(error.message, "error");
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  resetToLogin();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((btn) => btn.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("menuPanel").style.display = target === "menu" ? "block" : "none";
    ordersPanel.style.display = target === "orders" ? "block" : "none";
    profilePanel.style.display = target === "profile" ? "block" : "none";
  });
});

const updateLabelSelection = (labels) => {
  document.querySelectorAll(".label-checkbox").forEach((checkbox) => {
    checkbox.checked = labels.includes(checkbox.value);
  });
};

itemsList.addEventListener("click", (event) => {
  const itemId = event.target.dataset.edit;
  if (!itemId) return;
  const item = state.items.find((entry) => entry.item_id === itemId);
  if (!item) return;
  document.getElementById("itemId").value = item.item_id;
  document.getElementById("itemTitle").value = item.title;
  document.getElementById("itemDescription").value = item.description || "";
  document.getElementById("itemCategory").value = item.category || "";
  document.getElementById("itemPrice").value = item.price || "";
  document.getElementById("itemStatus").value = item.status || "available";
  document.getElementById("itemFeatured").checked = !!item.featured;
  document.getElementById("itemImageUrl").value = item.image_url || "";
  document.getElementById("itemVideoUrl").value = item.video_url || "";
  updateLabelSelection(item.labels || []);
  document.getElementById("customLabel").value = "";
  renderMediaPreview(item.image_url, item.video_url);
});

const renderMediaPreview = (imageUrl, videoUrl) => {
  mediaPreview.innerHTML = "";
  if (imageUrl) {
    mediaPreview.innerHTML += `<img src="${imageUrl}" alt="preview" />`;
  }
  if (videoUrl) {
    mediaPreview.innerHTML += `<video src="${videoUrl}" controls></video>`;
  }
};

const getSelectedLabels = () => {
  const labels = Array.from(document.querySelectorAll(".label-checkbox"))
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  const custom = document.getElementById("customLabel").value.trim();
  if (custom) labels.push(custom);
  return labels;
};

document.getElementById("saveItemBtn").addEventListener("click", async () => {
  const payload = {
    item_id: document.getElementById("itemId").value.trim(),
    title: document.getElementById("itemTitle").value.trim(),
    description: document.getElementById("itemDescription").value.trim(),
    category: document.getElementById("itemCategory").value,
    price: Number(document.getElementById("itemPrice").value),
    status: document.getElementById("itemStatus").value,
    featured: document.getElementById("itemFeatured").checked,
    image_url: document.getElementById("itemImageUrl").value.trim(),
    video_url: document.getElementById("itemVideoUrl").value.trim(),
    labels: getSelectedLabels(),
  };
  try {
    const data = await Api.merchant.saveItem(payload);
    const existingIndex = state.items.findIndex((item) => item.item_id === data.item.item_id);
    if (existingIndex >= 0) {
      state.items[existingIndex] = data.item;
    } else {
      state.items.unshift(data.item);
    }
    renderItemsList();
    UI.toast("Saved", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

document.getElementById("hideItemBtn").addEventListener("click", async () => {
  const itemId = document.getElementById("itemId").value.trim();
  if (!itemId) {
    UI.toast("Select an item to hide", "error");
    return;
  }
  try {
    const data = await Api.merchant.hideItem(itemId);
    const existingIndex = state.items.findIndex((item) => item.item_id === data.item.item_id);
    if (existingIndex >= 0) {
      state.items[existingIndex] = data.item;
    }
    renderItemsList();
    UI.toast("Item hidden", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

document.getElementById("uploadInput").addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const itemId = document.getElementById("itemId").value.trim() || "general";
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("itemId", itemId);
  try {
    const data = await Api.merchant.uploadMedia(formData);
    const urls = data.urls || [];
    const file = files[0];
    if (file.type.startsWith("video/")) {
      document.getElementById("itemVideoUrl").value = urls[0] || "";
    } else {
      document.getElementById("itemImageUrl").value = urls[0] || "";
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
  }
});

ordersPanel.addEventListener("change", async (event) => {
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
    renderKpis();
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const payload = {
    business_address: document.getElementById("businessAddress").value.trim(),
    parish: document.getElementById("businessParish").value.trim(),
    owner_name: document.getElementById("ownerName").value.trim(),
    owner_phone: document.getElementById("ownerPhone").value.trim(),
    owner_email: document.getElementById("ownerEmail").value.trim(),
    hours: document.getElementById("businessHours").value.trim(),
    about: document.getElementById("businessAbout").value.trim(),
    instagram: document.getElementById("instagramHandle").value.trim(),
    tiktok: document.getElementById("tiktokHandle").value.trim(),
  };
  const hasBasics = payload.business_address && payload.owner_name && payload.owner_phone;
  if (hasBasics) {
    payload.authorized = true;
  }
  try {
    const data = await Api.merchant.updateProfile(payload);
    state.profile = data.profile;
    profileWarning.style.display = state.profile.authorized ? "none" : "block";
    renderProfilePreview();
    UI.toast("Profile updated", "success");
  } catch (error) {
    if (!handleAuthError(error)) {
      UI.toast(error.message, "error");
    }
  }
});

const boot = async () => {
  if (localStorage.getItem("merchant_token")) {
    loginView.style.display = "none";
    dashboardView.style.display = "block";
    try {
      await loadDashboard();
    } catch (error) {
      if (!handleAuthError(error)) {
        UI.toast(error.message, "error");
      }
    }
  }
};

boot();
