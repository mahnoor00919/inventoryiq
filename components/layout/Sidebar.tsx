// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, TrendingUp, ShoppingCart,
  Users, ClipboardList, LogOut, ChevronDown, Boxes
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/services/api.service";
import { toast } from "@/components/ToasterRoot";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "USER"] },
  { href: "/manager/products", label: "Products", icon: Package, roles: ["ADMIN", "MANAGER"] },
  { href: "/manager/stock", label: "Stock Control", icon: TrendingUp, roles: ["ADMIN", "MANAGER"] },
  { href: "/user/catalog", label: "Product Catalog", icon: Boxes, roles: ["USER"] },
  { href: "/user/requests", label: "My Requests", icon: ShoppingCart, roles: ["USER"] },
  { href: "/manager/orders", label: "Orders", icon: ShoppingCart, roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/users", label: "User Management", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/logs", label: "Activity Logs", icon: ClipboardList, roles: ["ADMIN"] },
];

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "text-red-400",
  MANAGER: "text-amber-400",
  USER: "text-emerald-400",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  );

  async function handleLogout() {
    try {
      await api.logout();
      logout();
      router.push("/login");
    } catch {
      toast.error("Logout failed", "Please try again.");
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Boxes className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-100">InventoryIQ</h1>
            <p className="text-[10px] text-gray-500">Smart Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="section-title px-3 mb-3">Navigation</p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", isActive && "active")}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t border-gray-800">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/50">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-indigo-400">
                {getInitials(user.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user.name}</p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", ROLE_COLORS[user.role])}>
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
