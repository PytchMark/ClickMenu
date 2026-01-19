const state = {
  stores: [],
  items: [],
  cart: {},
  lastOrder: null,
  lastOrderContext: null,
};

const storeInput = document.getElementById("storeIdInput");
const loadMenuBtn = document.getElementById("loadMenuBtn");
const menuGrid = document.getElementById("menuGrid");
const topPicksGrid = document.getElementById("topPicksGrid");
const categoryRow = document.getElementById("categoryRow");
const storeHeader = document.getElementById("storeHeader");
const cartItems = document.getElementById("cartItems");
const storeSelect = document.getElementById("storeSelect");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const requestOrderBtn = document.getElementById("requestOrderBtn");
const whatsappCartBtn = document.getElementById("whatsappCartBtn");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const orderModal = document.getElementById("orderModal");
const stepIndicator = document.getElementById("stepIndicator");
const progressFill = document.getElementById("progressFill");
const continueBtn = document.getElementById("continueBtn");
const backBtn = document.getElementById("backBtn");
const confirmationOrderId = document.getElementById("confirmationOrderId");
const whatsappOrderBtn = document.getElementById("whatsappOrderBtn");
const floatingCartBtn = document.getElementById("floatingCartBtn");
const floatingCartCount = document.getElementById("floatingCartCount");
const cartDrawer = document.getElementById("cartDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const closeCartBtn = document.getElementById("closeCartBtn");

const openDrawer = () => {
  cartDrawer.classList.add("show");
  drawerBackdrop.classList.add("show");
};

const closeDrawer = () => {
  cartDrawer.classList.remove("show");
  drawerBackdrop.classList.remove("show");
};

const renderStoreHeader = () => {
  storeHeader.innerHTML = "";
  if (state.stores.length === 1) {
    const store = state.stores[0];
    storeHeader.innerHTML = `
      <img src="${store.logo_url || "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=160&q=80"}" alt="logo" />
      <div>
        <h2>${store.name}</h2>
        <div>${store.status === "active" ? "Trusted pickup & delivery ordering" : "Paused"}</div>
        <div class="chip-row" style="margin-top:12px;">
          <span class="chip">Made fresh</span>
          <span class="chip">Fast pickup</span>
          <span class="chip">WhatsApp support</span>
        </div>
      </div>
    `;
  }
};

const renderCategories = () => {
  const categories = Array.from(
    new Set(state.items.map((item) => item.category).filter(Boolean))
  );
  categoryRow.innerHTML = categories
    .map(
      (category) => `<button class="chip" data-category="${category}">${category}</button>`
    )
    .join("");
};

const buildMenuCard = (item) => `
  <div class="menu-card">
    <img src="${item.image_url || "https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=800&q=80"}" alt="${item.title}" />
    <small>${item.item_id}</small>
    <h4>${item.title}</h4>
    <p>${item.description || "Crafted fresh for today"}</p>
    <strong>${Formatters.money(item.price, "JMD")}</strong>
    <div class="card-actions">
      <button class="btn btn-primary" data-add="${item.item_id}">Add to Cart</button>
      <button class="btn btn-secondary" data-info="${item.item_id}">Request More Info</button>
    </div>
  </div>
`;

const renderTopPicks = () => {
  const picks = state.items.filter((item) => item.featured);
  if (!picks.length) {
    topPicksGrid.innerHTML = "<div>Top picks will appear here.</div>";
    return;
  }
  topPicksGrid.innerHTML = picks.map(buildMenuCard).join("");
};

const renderMenu = (filterCategory = null) => {
  if (!state.items.length) {
    menuGrid.innerHTML = UI.skeleton(4);
    return;
  }
  menuGrid.innerHTML = state.items
    .filter((item) => !filterCategory || item.category === filterCategory)
    .map(buildMenuCard)
    .join("");
};

const renderCart = () => {
  const items = Object.values(state.cart);
  cartItems.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item">
        <div>
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-meta">${Formatters.money(item.price, "JMD")} each</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-qty="${item.item_id}" data-change="-1">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-qty="${item.item_id}" data-change="1">+</button>
        </div>
        <div class="cart-item-subtotal">${Formatters.money(
          item.price * item.qty,
          "JMD"
        )}</div>
      </div>
    `
    )
    .join("");
  if (!items.length) {
    cartItems.innerHTML = "<div>Pick a few favorites to start a request.</div>";
  }
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  const totalCost = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartCount.textContent = totalItems;
  cartTotal.textContent = totalItems ? Formatters.money(totalCost, "JMD") : "—";
  floatingCartCount.textContent = totalItems;
};

const renderStoreSelect = () => {
  storeSelect.innerHTML = state.stores
    .map((store) => `<option value="${store.store_id}">${store.name}</option>`)
    .join("");
};

const loadMenu = async () => {
  const storeIds = storeInput.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!storeIds.length) {
    UI.toast("Enter at least one Store ID", "error");
    return;
  }
  menuGrid.innerHTML = UI.skeleton(4);
  try {
    const data = await Api.public.getCombinedMenu(storeIds.join(","));
    state.stores = data.stores || [];
    state.items = data.items || [];
    renderStoreHeader();
    renderCategories();
    renderTopPicks();
    renderMenu();
    renderStoreSelect();
  } catch (error) {
    UI.toast(error.message, "error");
  }
};

const getActiveStore = () => {
  const storeId = storeSelect.value;
  return state.stores.find((store) => store.store_id === storeId);
};

const buildWhatsAppMessage = (store, orderId = "") => {
  const context = orderId ? state.lastOrderContext : null;
  const items = context?.items || Object.values(state.cart);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const customerName =
    context?.customerName || document.getElementById("customerName").value.trim();
  const fulfillmentMethod =
    context?.fulfillmentMethod ||
    document.querySelector("input[name='fulfillmentMethod']:checked")?.value ||
    "pickup";
  const parish = context?.parish || document.getElementById("parishSelect").value || "TBD";
  const locationDetails =
    context?.locationDetails ||
    document.getElementById("locationDetails").value.trim() ||
    "TBD";
  const lineItems = items
    .map(
      (item) =>
        `${item.qty}x ${item.title} — ${Formatters.money(item.price * item.qty, "JMD")}`
    )
    .join("\n");
  return `Hi ${store?.name || "there"},\n\nStore: ${store?.name || "Store"}\n${
    orderId ? `Order ID: ${orderId}\n` : ""
  }Customer: ${customerName || "Customer"}\nFulfillment: ${fulfillmentMethod} (${parish})\n\nItems:\n${lineItems}\nTotal: ${Formatters.money(
    total,
    "JMD"
  )}\nLocation: ${locationDetails}`;
};

const buildWhatsAppUrl = (store, orderId = "") => {
  if (!store?.whatsapp) {
    UI.toast("WhatsApp not available for this store", "error");
    return null;
  }
  const message = buildWhatsAppMessage(store, orderId);
  return `https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    message
  )}`;
};

const steps = Array.from(document.querySelectorAll(".wizard-step"));

const setStep = (step) => {
  steps.forEach((entry) => {
    entry.classList.toggle("active", Number(entry.dataset.step) === step);
  });
  if (step === 3) {
    stepIndicator.textContent = "Request sent";
    progressFill.style.width = "100%";
    return;
  }
  stepIndicator.textContent = `Step ${step} of 2`;
  progressFill.style.width = step === 1 ? "50%" : "100%";
};

const openModal = () => {
  orderModal.classList.add("show");
  orderModal.setAttribute("aria-hidden", "false");
  setStep(1);
};

const closeModal = () => {
  orderModal.classList.remove("show");
  orderModal.setAttribute("aria-hidden", "true");
};

loadMenuBtn.addEventListener("click", loadMenu);
floatingCartBtn.addEventListener("click", openDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);
closeCartBtn.addEventListener("click", closeDrawer);

categoryRow.addEventListener("click", (event) => {
  if (!event.target.dataset.category) return;
  renderMenu(event.target.dataset.category);
});

menuGrid.addEventListener("click", (event) => {
  const addId = event.target.dataset.add;
  const infoId = event.target.dataset.info;
  if (!addId && !infoId) return;
  const item = state.items.find((entry) => entry.item_id === (addId || infoId));
  if (!item) return;
  if (addId) {
    const existing = state.cart[item.item_id] || { ...item, qty: 0 };
    state.cart[item.item_id] = { ...existing, qty: existing.qty + 1 };
    renderCart();
    UI.toast("Added to cart", "success");
  }
  if (infoId) {
    UI.toast(`We’ll ask about ${item.title} for you.`, "success");
  }
});

topPicksGrid.addEventListener("click", (event) => {
  const addId = event.target.dataset.add;
  if (!addId) return;
  const item = state.items.find((entry) => entry.item_id === addId);
  if (!item) return;
  const existing = state.cart[item.item_id] || { ...item, qty: 0 };
  state.cart[item.item_id] = { ...existing, qty: existing.qty + 1 };
  renderCart();
  UI.toast("Added to cart", "success");
});

cartItems.addEventListener("click", (event) => {
  const qtyId = event.target.dataset.qty;
  const change = Number(event.target.dataset.change || 0);
  if (!qtyId || !change) return;
  const existing = state.cart[qtyId];
  if (!existing) return;
  const nextQty = existing.qty + change;
  if (nextQty <= 0) {
    delete state.cart[qtyId];
  } else {
    state.cart[qtyId] = { ...existing, qty: nextQty };
  }
  renderCart();
});

requestOrderBtn.addEventListener("click", () => {
  if (!Object.values(state.cart).length) {
    UI.toast("Add at least one menu item", "error");
    return;
  }
  openModal();
});

whatsappCartBtn.addEventListener("click", () => {
  if (!Object.values(state.cart).length) {
    UI.toast("Add at least one menu item", "error");
    return;
  }
  const store = getActiveStore();
  const url = buildWhatsAppUrl(store);
  if (url) {
    window.open(url, "_blank");
  }
});

orderModal.addEventListener("click", (event) => {
  if (event.target.dataset.close) {
    closeModal();
  }
});

continueBtn.addEventListener("click", () => {
  const customerName = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  if (!customerName || !customerPhone) {
    UI.toast("Name and phone required", "error");
    return;
  }
  setStep(2);
});

backBtn.addEventListener("click", () => setStep(1));

submitOrderBtn.addEventListener("click", async () => {
  const items = Object.values(state.cart);
  if (!items.length) {
    UI.toast("Add at least one menu item", "error");
    return;
  }
  const storeId = storeSelect.value;
  const customerName = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  const customerEmail = document.getElementById("customerEmail").value.trim();
  const notes = document.getElementById("orderNotes").value.trim();
  const fulfillmentMethod =
    document.querySelector("input[name='fulfillmentMethod']:checked")?.value;
  const parish = document.getElementById("parishSelect").value;
  const locationDetails = document.getElementById("locationDetails").value.trim();
  const preferredTime = document.getElementById("preferredTime").value.trim();

  if (!customerName || !customerPhone) {
    UI.toast("Name and phone required", "error");
    setStep(1);
    return;
  }
  if (!fulfillmentMethod || !parish || !locationDetails) {
    UI.toast("Fulfillment, parish, and location required", "error");
    return;
  }

  UI.setLoading(submitOrderBtn, true);
  try {
    const payload = {
      customerName,
      customerPhone,
      customerEmail,
      notes,
      fulfillmentMethod,
      parish,
      locationDetails,
      preferredTime,
      items: items.map((item) => ({
        itemId: item.item_id,
        title: item.title,
        qty: item.qty,
        price: item.price,
      })),
    };
    const data = await Api.public.createOrder(storeId, payload);
    state.lastOrder = data.request;
    state.lastOrderContext = {
      items,
      customerName,
      fulfillmentMethod,
      parish,
      locationDetails,
    };
    confirmationOrderId.textContent = data.request.request_id || data.request.requestId;
    UI.toast(`Request sent: ${confirmationOrderId.textContent}`, "success");
    whatsappOrderBtn.onclick = () => {
      const store = getActiveStore();
      const url = buildWhatsAppUrl(
        store,
        data.request.request_id || data.request.requestId
      );
      if (url) window.open(url, "_blank");
    };
    setStep(3);
    state.cart = {};
    renderCart();
  } catch (error) {
    UI.toast(error.message, "error");
  } finally {
    UI.setLoading(submitOrderBtn, false);
  }
});

const params = new URLSearchParams(window.location.search);
const preset = params.get("storeIds") || params.get("storeId") || "";
if (preset) {
  storeInput.value = preset;
  loadMenu();
}
renderCart();
