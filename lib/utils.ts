// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM dd, yyyy");
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM dd, yyyy HH:mm");
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateSKU(category: string, name: string): string {
  const cat = category.slice(0, 3).toUpperCase();
  const nm = name.replace(/\s+/g, "-").toUpperCase().slice(0, 8);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${cat}-${nm}-${rand}`;
}

export function getStockStatus(quantity: number, threshold: number): {
  label: string;
  color: "green" | "yellow" | "red";
} {
  if (quantity === 0) return { label: "Out of Stock", color: "red" };
  if (quantity <= threshold) return { label: "Low Stock", color: "yellow" };
  return { label: "In Stock", color: "green" };
}

export function parseLogMeta(meta?: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    USER_CREATED: "User Created",
    USER_UPDATED: "User Updated",
    USER_DEACTIVATED: "User Deactivated",
    USER_ACTIVATED: "User Activated",
    PRODUCT_CREATED: "Product Added",
    PRODUCT_UPDATED: "Product Updated",
    PRODUCT_DELETED: "Product Deleted",
    STOCK_INCREASED: "Stock Increased",
    STOCK_DECREASED: "Stock Decreased",
    ORDER_CREATED: "Order Placed",
    ORDER_APPROVED: "Order Approved",
    ORDER_REJECTED: "Order Rejected",
    ORDER_FULFILLED: "Order Fulfilled",
    LOGIN: "User Login",
    LOGOUT: "User Logout",
  };
  return labels[action] || action;
}

export function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
