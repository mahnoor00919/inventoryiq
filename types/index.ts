// types/index.ts
export type Role = "ADMIN" | "MANAGER" | "USER";
export type OrderStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
export type LogAction =
  | "USER_CREATED" | "USER_UPDATED" | "USER_DEACTIVATED" | "USER_ACTIVATED"
  | "PRODUCT_CREATED" | "PRODUCT_UPDATED" | "PRODUCT_DELETED"
  | "STOCK_INCREASED" | "STOCK_DECREASED"
  | "ORDER_CREATED" | "ORDER_APPROVED" | "ORDER_REJECTED" | "ORDER_FULFILLED"
  | "LOGIN" | "LOGOUT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  category: string;
  supplier?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockHistory {
  id: string;
  productId: string;
  product?: Product;
  change: number;
  reason?: string;
  previousQty: number;
  newQty: number;
  createdAt: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  userId: string;
  user?: User;
  productId: string;
  product?: Product;
  quantity: number;
  status: OrderStatus;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: LogAction;
  userId?: string;
  user?: User;
  targetId?: string;
  targetType?: string;
  meta?: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth types
export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

// Dashboard types
export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  pendingOrders: number;
  totalUsers: number;
  recentActivity: ActivityLog[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProductForm {
  name: string;
  sku: string;
  description?: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  category: string;
  supplier?: string;
  supplierEmail?: string;
  supplierPhone?: string;
}

export interface StockUpdateForm {
  productId: string;
  change: number;
  reason: string;
}

export interface OrderRequestForm {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface UserCreateForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}
