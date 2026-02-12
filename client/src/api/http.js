const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const SESSION_KEY = "smartpos_session";

const buildQuery = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const loadSession = () => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const request = async (path, options = {}) => {
  const { parseAs = "json", ...requestOptions } = options;
  const session = loadSession();
  const isJsonPayload = requestOptions.body && !(requestOptions.body instanceof FormData);

  const config = {
    ...requestOptions,
    headers: {
      ...(isJsonPayload ? { "Content-Type": "application/json" } : {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
      ...(session?.user?.role ? { "x-user-role": session.user.role } : {}),
      ...(requestOptions.headers || {})
    }
  };

  const response = await fetch(`${API_BASE}${path}`, config);
  let payload = null;

  if (parseAs === "text") {
    payload = await response.text();
  } else if (parseAs === "json") {
    const contentType = response.headers.get("content-type") || "";
    payload = contentType.includes("application/json") ? await response.json() : null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
};

export const api = {
  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),

  getDashboard: () => request("/dashboard"),
  getReports: (days = 30) => request(`/reports/overview${buildQuery({ days })}`),

  getCategories: () => request("/categories"),
  createCategory: (payload) =>
    request("/categories", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateCategory: (id, payload) =>
    request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteCategory: (id) =>
    request(`/categories/${id}`, {
      method: "DELETE"
    }),
  publishCategory: (id, note = "") =>
    request(`/categories/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ note })
    }),
  getCategoryVersions: (id) => request(`/categories/${id}/versions`),
  rollbackCategoryVersion: (id, version) =>
    request(`/categories/${id}/rollback/${version}`, {
      method: "POST"
    }),
  importCategoriesCsv: (payload) =>
    request("/categories/import", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  exportCategoriesCsv: () =>
    request("/categories/export/csv", {
      parseAs: "text"
    }),
  bulkUpsertCategories: (payload) =>
    request("/categories/bulk", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getProducts: (params) => request(`/products${buildQuery(params)}`),
  createProduct: (payload) =>
    request("/products", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateProduct: (id, payload) =>
    request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteProduct: (id) =>
    request(`/products/${id}`, {
      method: "DELETE"
    }),
  publishProduct: (id, note = "") =>
    request(`/products/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ note })
    }),
  getProductVersions: (id) => request(`/products/${id}/versions`),
  rollbackProductVersion: (id, version) =>
    request(`/products/${id}/rollback/${version}`, {
      method: "POST"
    }),
  importProductsCsv: (payload) =>
    request("/products/import", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  exportProductsCsv: () =>
    request("/products/export/csv", {
      parseAs: "text"
    }),
  bulkUpsertProducts: (payload) =>
    request("/products/bulk", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getCustomers: () => request("/customers"),
  createCustomer: (payload) =>
    request("/customers", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteCustomer: (id) =>
    request(`/customers/${id}`, {
      method: "DELETE"
    }),

  createSale: (payload) =>
    request("/sales", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getSales: (params) => request(`/sales${buildQuery(params)}`)
};
