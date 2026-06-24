// services/api.service.ts
import type { ApiResponse } from "@/types";

const BASE_URL = ""; // force same-origin API calls

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(name: string, email: string, password: string) {
    return this.request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  async logout() {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async getSession() {
    return this.request("/api/auth/session");
  }

  // Dashboard
  async getDashboard() {
    return this.request("/api/dashboard");
  }

  // Products
  async getProducts(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
  }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.search) qs.set("search", params.search);
    if (params?.category) qs.set("category", params.category);
    if (params?.lowStock) qs.set("lowStock", "true");
    return this.request(`/api/products?${qs}`);
  }

  async getProduct(id: string) {
    return this.request(`/api/products/${id}`);
  }

  async createProduct(data: Record<string, unknown>) {
    return this.request("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Record<string, unknown>) {
    return this.request(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/api/products/${id}`, { method: "DELETE" });
  }

  // Stock
  async updateStock(data: { productId: string; change: number; reason: string }) {
    return this.request("/api/stock", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getStockHistory(productId?: string, page = 1) {
    const qs = new URLSearchParams({ page: String(page) });
    if (productId) qs.set("productId", productId);
    return this.request(`/api/stock?${qs}`);
  }

  // Orders
  async getOrders(params?: { status?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    return this.request(`/api/orders?${qs}`);
  }

  async createOrder(data: { productId: string; quantity: number; notes?: string }) {
    return this.request("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async reviewOrder(id: string, status: "APPROVED" | "REJECTED" | "FULFILLED") {
    return this.request(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Users
  async getUsers(params?: { search?: string; role?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.role) qs.set("role", params.role);
    if (params?.page) qs.set("page", String(params.page));
    return this.request(`/api/users?${qs}`);
  }

  async createUser(data: Record<string, unknown>) {
    return this.request("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Record<string, unknown>) {
    return this.request(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Logs
  async getLogs(params?: { action?: string; targetType?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.action) qs.set("action", params.action);
    if (params?.targetType) qs.set("targetType", params.targetType);
    if (params?.page) qs.set("page", String(params.page));
    return this.request(`/api/logs?${qs}`);
  }
}

export const api = new ApiService();
