import api from "./api";

export const AuthAPI = {
  register: (payload) => api.post("/auth/register/", payload),
  login: (payload) => api.post("/auth/login/", payload),
  me: () => api.get("/auth/me/"),
  logout: () => api.post("/auth/logout/"),
};

export const CategoryAPI = {
  list: () => api.get("/categories/"),
  create: (payload) => api.post("/categories/", payload),
  remove: (id) => api.delete(`/categories/${id}/`),
};

export const ExpenseAPI = {
  list: (params) => api.get("/expenses/", { params }),
  create: (payload) => api.post("/expenses/", payload),
  update: (id, payload) => api.patch(`/expenses/${id}/`, payload),
  remove: (id) => api.delete(`/expenses/${id}/`),
  exportUrl: (params) => {
    const qs = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/expenses/export/?${qs}`;
  },
};

export const IncomeAPI = {
  list: (params) => api.get("/income/", { params }),
  create: (payload) => api.post("/income/", payload),
  update: (id, payload) => api.patch(`/income/${id}/`, payload),
  remove: (id) => api.delete(`/income/${id}/`),
};

export const BudgetAPI = {
  list: (params) => api.get("/budgets/", { params }),
  create: (payload) => api.post("/budgets/", payload),
};

export const CategoryBudgetAPI = {
  list: (params) => api.get("/category-budgets/", { params }),
  create: (payload) => api.post("/category-budgets/", payload),
  remove: (id) => api.delete(`/category-budgets/${id}/`),
};

export const RecurringAPI = {
  list: () => api.get("/recurring-expenses/"),
  create: (payload) => api.post("/recurring-expenses/", payload),
  update: (id, payload) => api.patch(`/recurring-expenses/${id}/`, payload),
  remove: (id) => api.delete(`/recurring-expenses/${id}/`),
  process: () => api.post("/recurring-expenses/process/"),
};

export const DashboardAPI = {
  get: (params) => api.get("/dashboard/", { params }),
};

export const AnalyticsAPI = {
  get: (params) => api.get("/analytics/", { params }),
};

export const CalendarAPI = {
  get: (params) => api.get("/calendar/", { params }),
};
