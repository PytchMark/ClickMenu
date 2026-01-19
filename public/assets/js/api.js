const Api = (() => {
  const base = "";

  const getToken = (key) => localStorage.getItem(key);

  const buildRequestError = ({ message, status, url, snippet, isNonJson }) => {
    const error = new Error(message);
    error.status = status;
    error.url = url;
    error.snippet = snippet;
    error.isNonJson = isNonJson;
    return error;
  };

  const parseResponse = async (response, url) => {
    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    const isJson = contentType.includes("application/json");

    if (!rawText) {
      if (!response.ok) {
        throw buildRequestError({
          message: `Request failed (${response.status})`,
          status: response.status,
          url,
          snippet: "",
          isNonJson: !isJson,
        });
      }
      return { data: null };
    }

    if (!isJson) {
      throw buildRequestError({
        message: `Request failed (${response.status}). Server returned non-JSON response.`,
        status: response.status,
        url,
        snippet: rawText.slice(0, 200),
        isNonJson: true,
      });
    }

    try {
      return { data: JSON.parse(rawText) };
    } catch (error) {
      throw buildRequestError({
        message: `Invalid JSON response (${response.status}).`,
        status: response.status,
        url,
        snippet: rawText.slice(0, 200),
        isNonJson: true,
      });
    }
  };

  const request = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, options);
    const { data } = await parseResponse(response, `${base}${url}`);
    if (!response.ok || (data && data.ok === false)) {
      throw buildRequestError({
        message: data?.error || `Request failed (${response.status})`,
        status: response.status,
        url: `${base}${url}`,
        snippet: "",
        isNonJson: false,
      });
    }
    return data || { ok: true };
  };

  const withAuth = (token) => (options = {}) => ({
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      query.append(key, value);
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : "";
  };

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
      menu: () =>
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
      hideItem: (itemId) =>
        request(
          `/api/merchant/items/${itemId}/archive`,
          withAuth(getToken("merchant_token"))({ method: "POST" })
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
      analytics: () =>
        request(
          "/api/merchant/analytics",
          withAuth(getToken("merchant_token"))({ method: "GET" })
        ),
      updateProfile: (payload) =>
        request(
          "/api/merchant/profile",
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
        const { data } = await parseResponse(response, "/api/media/upload");
        if (!response.ok || (data && data.ok === false)) {
          throw buildRequestError({
            message: data?.error || `Upload failed (${response.status})`,
            status: response.status,
            url: "/api/media/upload",
            snippet: "",
            isNonJson: false,
          });
        }
        return data || { ok: true };
      },
    },
    admin: {
      login: (payload) =>
        request("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      stores: (params = {}) =>
        request(
          `/api/admin/stores${buildQuery(params)}`,
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      storeDetail: (storeId) =>
        request(
          `/api/admin/stores/${storeId}`,
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      updateStore: (storeId, payload) =>
        request(
          `/api/admin/stores/${storeId}`,
          withAuth(getToken("admin_token"))({
            method: "PATCH",
            body: JSON.stringify(payload),
          })
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
      orders: (params = {}) =>
        request(
          `/api/admin/orders${buildQuery(params)}`,
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      updateOrderStatus: (requestId, payload) =>
        request(
          `/api/admin/orders/${requestId}/status`,
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      menu: (storeId) =>
        request(
          `/api/admin/menu${storeId ? `?storeId=${storeId}` : ""}`,
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      menuItems: (params = {}) =>
        request(
          `/api/admin/menu-items${buildQuery(params)}`,
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      updateMenuItem: (itemId, payload) =>
        request(
          `/api/admin/menu-items/${itemId}`,
          withAuth(getToken("admin_token"))({
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        ),
      bulkUpdateStores: (payload) =>
        request(
          "/api/admin/stores/bulk-update",
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      bulkResetPasscodes: (payload) =>
        request(
          "/api/admin/stores/bulk-reset-passcodes",
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      deleteMenuItem: (itemId, payload) =>
        request(
          `/api/admin/menu/${itemId}/delete`,
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      summary: () =>
        request(
          "/api/admin/summary",
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
      resetPasscode: (payload) =>
        request(
          "/api/admin/reset-passcode",
          withAuth(getToken("admin_token"))({
            method: "POST",
            body: JSON.stringify(payload),
          })
        ),
      analytics: () =>
        request(
          "/api/admin/analytics",
          withAuth(getToken("admin_token"))({ method: "GET" })
        ),
    },
  };
})();
