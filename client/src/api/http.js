const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

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

const request = async (path, options = {}) => {
  const config = {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  };

  const response = await fetch(`${API_BASE}${path}`, config);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = payload?.message || `Request failed (${response.status})`;
    throw new Error(errorMessage);
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
  deleteCategory: (id) =>
    request(`/categories/${id}`, {
      method: "DELETE"
    }),

  getProducts: (params) => request(`/products${buildQuery(params)}`),
  createProduct: (payload) =>
    request("/products", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteProduct: (id) =>
    request(`/products/${id}`, {
      method: "DELETE"
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
