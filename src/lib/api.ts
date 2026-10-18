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
  image_url?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
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
  /**
   * Stok yang sebenarnya dipakai backend: jumlah baris `inventory_slots`
   * berstatus `available` untuk harga ini (lihat ProductPriceWithStock di
   * domain/models.go). `stock` tidak pernah dikirim katalog dan hanya
   * dipertahankan untuk data lama.
   */
  available_slots?: number;
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
  /** Tidak pernah dikirim katalog; stok dihitung dari available_slots. */
  stock?: number;
  created_at?: string;
  updated_at?: string;
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
  user_id?: string;
  voucher_id?: string | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  payment_due_at: string;
  shipping_address?: string;
  notes?: string;
  items: Array<{
    id: string;
    order_id?: string;
    product_price_id: string;
    product_name: string;
    duration_name: string;
    unit_price: number;
    quantity: number;
    device_count?: number;
    line_total: number;
  }>;
  payments?: Array<{
    id: string;
    order_id?: string;
    provider: string;
    provider_payment_id?: string;
    status: string;
    amount: number;
    checkout_url?: string;
    paid_at?: string | null;
    created_at?: string;
    updated_at?: string;
  }>;
  // Present on the admin order list and dashboard, which preload it. The
  // storefront's own order endpoints do not, so it stays optional.
  customer?: { id: string; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
};

/** One active sign-in, as returned by GET /auth/sessions. The token itself is
 * never sent to the browser; only enough to recognise the device. */
export type ApiSession = {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  expires_at: string;
  current: boolean;
};

export type ApiTestimonial = {
  id: string;
  title: string;
  body: string;
  rating: number;
  reviewer_name: string;
  product_name?: string;
  created_at: string;
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
  // Server Components run inside the deployment network. They must use the
  // internal service URL when one is provided; the public edge URL may not be
  // resolvable (or its certificate trusted) from the container itself.
  const serverInternal = typeof window === "undefined" ? process.env.INTERNAL_API_URL : undefined;
  const configured = (serverInternal || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
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

/** Machine-readable error code from the W0 error envelope, if present. */
export function apiErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (!error.payload || typeof error.payload !== "object" || !("code" in error.payload)) return null;
  const code = (error.payload as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** Additive fields that accompany a `price_changed` checkout conflict. */
export function apiErrorNumber(error: unknown, field: string): number | null {
  if (!(error instanceof ApiError)) return null;
  if (!error.payload || typeof error.payload !== "object" || !(field in error.payload)) return null;
  const value = (error.payload as Record<string, unknown>)[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

async function sameOriginRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await readPayload(response);
  if (!response.ok) {
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

  // Until the address is verified the account cannot sign in at all, so a lost
  // activation email has to be recoverable. The backend retires the previous
  // unused link, so only the newest one works.
  resendVerification: (email: string) =>
    apiRequest<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // A missing account is returned as 404 so the page can direct the visitor to
  // registration, per the product requirement.
  forgotPassword: (email: string) =>
    // Keep this browser request same-origin. The Route Handler relays it to the
    // backend, so password recovery cannot be broken by cross-origin CSP/CORS.
    sameOriginRequest<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; password: string }) =>
    apiRequest<{ message: string; user: ApiUser }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Menyertakan kata sandi saat ini walau pemanggilnya sudah punya sesi, supaya
  // token akses yang dicuri sendirian tidak cukup untuk mengunci pemilik akun.
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiRequest<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listSessions: () => apiRequest<{ sessions: ApiSession[] }>("/auth/sessions"),

  revokeSession: (id: string) =>
    apiRequest<{ message: string }>(`/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),

  revokeOtherSessions: () =>
    apiRequest<{ message: string; ended: number }>("/auth/sessions", { method: "DELETE" }),

  getMe: () => apiRequest<ApiUser>("/me"),

  // Which sign-in methods this deployment can actually offer. Public, so the
  // login screen can hide a provider that has no credentials behind it.
  authProviders: () => apiRequest<{ password: boolean; google: boolean }>("/public/auth-providers"),

  googleLoginUrl: `${API_BASE}/auth/google`,
};

export type ApiIssueReport = {
  id: string;
  name: string;
  email: string;
  order_number: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
};

/** Field-level messages the backend returns with a 422 on an issue report. */
export type ReportFieldErrors = {
  name?: string;
  email?: string;
  order_number?: string;
  category?: string;
  message?: string;
};

export class ReportApiError extends ApiError {
  readonly fields: ReportFieldErrors;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status: number, payload: unknown, fields: ReportFieldErrors, retryAfterSeconds: number | null) {
    super(message, status, payload);
    this.name = "ReportApiError";
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const reportsApi = {
  create: async (data: {
    name: string;
    email: string;
    order_number: string;
    category: string;
    message: string;
  }) => {
    try {
      return await apiRequest<{ message: string; report: ApiIssueReport }>("/public/reports", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        const payload = error.payload as { fields?: ReportFieldErrors; retry_after?: number } | undefined;
        throw new ReportApiError(
          error.message,
          error.status,
          error.payload,
          payload?.fields ?? {},
          typeof payload?.retry_after === "number" ? payload.retry_after : null,
        );
      }
      throw error;
    }
  },
};

export const catalogApi = {
  listCategories: () =>
    apiRequest<{ categories: ApiCategory[] }>("/public/categories"),

  listProducts: (params?: {
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    page?: number;
    per_page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.search) searchParams.set("search", params.search);
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

export const testimonialsApi = {
  // Only testimonials an admin has approved come back from this endpoint; the
  // backend drops the reviewer's email before serialising.
  list: (params?: { page?: number; per_page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.per_page) searchParams.set("per_page", String(params.per_page));
    const query = searchParams.toString();
    return apiRequest<{ testimonials: ApiTestimonial[]; page: number; per_page: number; total: number }>(
      `/public/testimonials${query ? `?${query}` : ""}`,
    );
  },
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
    data: {
      voucher_code?: string;
      items: Array<{ product_price_id: string; quantity: number; device_count?: number }>;
      /** Total sebelum diskon yang sudah dilihat dan disetujui pembeli. */
      expected_subtotal?: number;
      /** Kanal kanonik pilihan pembeli; kosong berarti kanal bawaan provider. */
      payment_channel?: string;
    },
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
  // Rutenya /admin/inventory (lihat registerAdmin): tidak ada segmen "accounts",
  // dan versi sebelumnya membuat halaman inventory dashboard selalu 404.
  listInventoryAccounts: (params?: { page?: number; per_page?: number; product_id?: string }) =>
    apiRequest<Record<string, unknown>>(`/admin/inventory${toQuery(params)}`),
  createInventoryAccount: (data: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/admin/inventory", { method: "POST", body: JSON.stringify(data) }),
  updateInventoryAccount: (id: string, data: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/admin/inventory/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  // Kapasitas jual sebuah paket. Inilah yang membuat produk bisa dibeli: katalog
  // menghitung ketersediaan dari baris slot berstatus available.
  createInventorySlots: (data: { product_price_id: string; quantity: number }) =>
    apiRequest<{ created: number }>("/admin/inventory/slots", { method: "POST", body: JSON.stringify(data) }),
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
