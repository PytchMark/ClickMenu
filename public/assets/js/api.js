const Api = (() => {
  const base = "";

  const getToken = (key) => localStorage.getItem(key);

  const request = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, options);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  };

  const withAuth = (token) => (options = {}) => ({
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    health: () => request("/api/health"),
    public: {
      getStore: (storeId) => request(`/api/public/store/${storeId}`),
      getMenu: (storeId, all = false) =>
        request(`/api/public/store/${storeId}/menu${all ? "?all=1" : ""}`),
      getCombinedMenu: (storeIds) => request(`/api/public/menu?storeIds=${storeIds}`),
      createOrder: (storeId, payload) =>
        request(`/api/public/store/${storeId}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
    },
    merchant: {
      login: (payload) =>
        request("/api/merchant/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      me: () =>
        request(
          "/api/merchant/me",
          withAuth(getToken("merchant_token"))({ method: "GET" })
        ),
      items: () =>
        request(
          "/api/merchant/items",
          withAuth(getToken("merchant_token"))({ method: "GET" })
        ),
      saveItem: (payload) =>
        request(
          "/api/merchant/items",
          withAuth(getToken("merchant_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      updateItem: (itemId, payload) =>
        request(
          `/api/merchant/items/${itemId}`,
          withAuth(getToken("merchant_token"))({
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        ),
      orders: () =>
        request(
          "/api/merchant/orders",
          withAuth(getToken("merchant_token"))({ method: "GET" })
        ),
      updateOrderStatus: (requestId, payload) =>
        request(
          `/api/merchant/orders/${requestId}/status`,
          withAuth(getToken("merchant_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      uploadMedia: async (formData) => {
        const response = await fetch("/api/media/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken("merchant_token")}`,
          },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Upload failed");
        }
        return data;
      },
    },
    admin: {
      login: (payload) =>
        request("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      stores: () =>
        request(
          "/api/admin/stores",
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      createStore: (payload) =>
        request(
          "/api/admin/stores",
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      resetPassword: (payload) =>
        request(
          "/api/admin/reset-password",
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      orders: (storeId) =>
        request(
          `/api/admin/orders${storeId ? `?storeId=${storeId}` : ""}`,
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      summary: () =>
        request(
          "/api/admin/summary",
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
    },
  };
})();
