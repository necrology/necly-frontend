import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "seller" | "admin";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSessionResponse {
  user: ApiUser;
  access_token: string;
  expires_in: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active?: boolean;
};

export type ApiProductDuration = {
  id?: string;
  name: string;
  days: number;
};

export type ApiProductPrice = {
  id: string;
  amount: number;
  currency?: string;
  active?: boolean;
  duration?: ApiProductDuration;
  duration_name?: string;
  duration_days?: number;
  stock?: number;
};

export type ApiProduct = {
  id: string;
  category_id?: string;
  category?: ApiCategory | string;
  name: string;
  slug: string;
  description: string;
  image_url?: string;
  active?: boolean;
  prices?: ApiProductPrice[];
  stock?: number;
};

export type ApiCartItem = {
  id: string;
  cart_id?: string;
  product_price_id: string;
  product_price?: ApiProductPrice & { product?: ApiProduct };
  quantity: number;
};

export type ApiOrder = {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  payment_due_at: string;
  items: Array<{
    id: string;
    product_price_id: string;
    product_name: string;
    duration_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  payments?: Array<{
    id: string;
    provider: string;
    status: string;
    amount: number;
    checkout_url?: string;
    paid_at?: string | null;
  }>;
  created_at: string;
  updated_at: string;
};

export type CheckoutResponse = {
  order: ApiOrder;
  payment: {
    id: string;
    order_id: string;
    provider: string;
    status: string;
    amount: number;
    checkout_url?: string;
  };
  checkout_url: string;
};

function apiBaseFromEnvironment() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
  return configured.endsWith("/api/v1") ? configured : `${configured}/api/v1`;
}

export const API_BASE = apiBaseFromEnvironment();
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isLoading: false }),
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));

function normalizeUser(user: ApiUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerifiedAt: user.email_verified_at ?? null,
    createdAt: user.created_at ?? "",
    updatedAt: user.updated_at ?? "",
  };
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }
  const text = await response.text();
  return text || undefined;
}

function messageFromPayload(payload: unknown, status: number) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error) return error;
  }
  if (typeof payload === "string" && payload) return payload;
  return `HTTP ${status}`;
}

async function fetchApi(endpoint: string, options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

let refreshInFlight: Promise<AuthSessionResponse> | null = null;

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetchApi("/auth/refresh", { method: "POST" }, null);
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new ApiError(messageFromPayload(payload, response.status), response.status, payload);
      }
      const session = payload as AuthSessionResponse;
      useAuthStore.getState().setAuth(normalizeUser(session.user), session.access_token);
      return session;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function mayRefresh(endpoint: string) {
  return !endpoint.startsWith("/auth/");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const firstToken = useAuthStore.getState().accessToken;
  let response = await fetchApi(endpoint, options, firstToken);

  if (response.status === 401 && firstToken && mayRefresh(endpoint)) {
    try {
      await refreshSession();
      response = await fetchApi(endpoint, options, useAuthStore.getState().accessToken);
    } catch {
      useAuthStore.getState().clearAuth();
    }
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    if (response.status === 401) useAuthStore.getState().clearAuth();
    throw new ApiError(messageFromPayload(payload, response.status), response.status, payload);
  }
  return payload as T;
}

export async function bootstrapAuth() {
  const state = useAuthStore.getState();
  if (state.accessToken) return state.user;
  state.setLoading(true);
  try {
    const session = await refreshSession();
    return normalizeUser(session.user);
  } catch {
    useAuthStore.getState().clearAuth();
    return null;
  }
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiRequest<{ user: ApiUser; verification_token?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: async (data: { email: string; password: string }) => {
    const session = await apiRequest<AuthSessionResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const user = normalizeUser(session.user);
    useAuthStore.getState().setAuth(user, session.access_token);
    return { ...session, user };
  },

  refresh: refreshSession,

  logout: async () => {
    try {
      await apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
    } finally {
      useAuthStore.getState().clearAuth();
    }
  },

  verifyEmail: (token: string) =>
    apiRequest<{ message: string; user: ApiUser }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  getMe: () => apiRequest<ApiUser>("/me"),
  googleLoginUrl: `${API_BASE}/auth/google`,
};

export const catalogApi = {
  listCategories: () =>
    apiRequest<{ categories: ApiCategory[] }>("/public/categories"),

  listProducts: (params?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    page?: number;
    per_page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.min_price !== undefined) searchParams.set("min_price", String(params.min_price));
    if (params?.max_price !== undefined) searchParams.set("max_price", String(params.max_price));
    if (params?.in_stock !== undefined) searchParams.set("in_stock", String(params.in_stock));
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    const query = searchParams.toString();
    return apiRequest<{ products: ApiProduct[]; page: number; per_page: number; total: number }>(
      `/public/products${query ? `?${query}` : ""}`,
    );
  },

  getProduct: (id: string) =>
    apiRequest<ApiProduct>(`/public/products/${encodeURIComponent(id)}`),

  getProductPrices: (id: string) =>
    apiRequest<{ prices: ApiProductPrice[] }>(`/public/products/${encodeURIComponent(id)}/prices`),
};

export const cartApi = {
  getCart: () => apiRequest<{ items: ApiCartItem[]; total: number }>("/cart"),

  addItem: (data: { product_price_id: string; quantity: number }) =>
    apiRequest<{ item: ApiCartItem }>("/cart/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateItem: (itemId: string, quantity: number) =>
    apiRequest<{ item: ApiCartItem }>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (itemId: string) =>
    apiRequest<void>(`/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
};

export const checkoutApi = {
  checkout: (
    data: { voucher_code?: string; items: Array<{ product_price_id: string; quantity: number }> },
    idempotencyKey: string,
  ) =>
    apiRequest<CheckoutResponse>("/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(data),
    }),

  listOrders: (params?: { page?: number; per_page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    const query = searchParams.toString();
    return apiRequest<{ orders: ApiOrder[]; page: number; per_page: number; total: number }>(
      `/orders${query ? `?${query}` : ""}`,
    );
  },

  getOrder: (id: string) => apiRequest<ApiOrder>(`/orders/${encodeURIComponent(id)}`),
};

export const adminApi = {
  dashboard: () => apiRequest<Record<string, unknown>>("/admin/dashboard"),
  listUsers: (params?: { page?: number; per_page?: number }) =>
    apiRequest<Record<string, unknown>>(`/admin/users${toQuery(params)}`),
  getUser: (id: string) => apiRequest<ApiUser>(`/admin/users/${encodeURIComponent(id)}`),
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiRequest<ApiUser>(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) => apiRequest<void>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listProducts: (params?: { page?: number; per_page?: number }) =>
    apiRequest<Record<string, unknown>>(`/admin/products${toQuery(params)}`),
  createProduct: (data: Record<string, unknown>) =>
    apiRequest<ApiProduct>("/admin/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    apiRequest<ApiProduct>(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct: (id: string) => apiRequest<void>(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listCategories: (params?: { page?: number; per_page?: number }) =>
    apiRequest<Record<string, unknown>>(`/admin/categories${toQuery(params)}`),
  createCategory: (data: { name: string; slug: string; description?: string }) =>
    apiRequest<ApiCategory>("/admin/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    apiRequest<ApiCategory>(`/admin/categories/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCategory: (id: string) => apiRequest<void>(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listOrders: (params?: { page?: number; per_page?: number; status?: string }) =>
    apiRequest<Record<string, unknown>>(`/admin/orders${toQuery(params)}`),
  getOrder: (id: string) => apiRequest<ApiOrder>(`/admin/orders/${encodeURIComponent(id)}`),
  updateOrderStatus: (id: string, status: string) =>
    apiRequest<ApiOrder>(`/admin/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listVouchers: (params?: { page?: number; per_page?: number }) =>
    apiRequest<Record<string, unknown>>(`/admin/vouchers${toQuery(params)}`),
  createVoucher: (data: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/admin/vouchers", { method: "POST", body: JSON.stringify(data) }),
  updateVoucher: (id: string, data: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/admin/vouchers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteVoucher: (id: string) => apiRequest<void>(`/admin/vouchers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listInventoryAccounts: (params?: { page?: number; per_page?: number; product_id?: string }) =>
    apiRequest<Record<string, unknown>>(`/admin/inventory/accounts${toQuery(params)}`),
  createInventoryAccount: (data: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/admin/inventory/accounts", { method: "POST", body: JSON.stringify(data) }),
  updateInventoryAccount: (id: string, data: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/admin/inventory/accounts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  listAuditLogs: (params?: { page?: number; per_page?: number }) =>
    apiRequest<Record<string, unknown>>(`/admin/audit-logs${toQuery(params)}`),
};

function toQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
