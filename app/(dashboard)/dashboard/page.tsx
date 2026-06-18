// app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Package, DollarSign, AlertTriangle, Clock,
  Users, TrendingUp, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, Spinner, Badge } from "@/components/ui";
import { api } from "@/services/api.service";
import { formatCurrency, timeAgo, getActionLabel, getStockStatus } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/components/ToasterRoot";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({
  title, value, subtitle, icon: Icon, trend, color = "indigo"
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: "indigo" | "emerald" | "amber" | "red";
}) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg border ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-100 mb-1">{value}</p>
      <p className="text-xs font-medium text-gray-400">{title}</p>
      {subtitle && <p className="text-[11px] text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.getDashboard();
        if (res.success) {
          setData(res.data as Record<string, unknown>);
        } else {
          toast.error("Failed to load dashboard");
        }
      } catch {
        toast.error("Network error", "Could not load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Overview of your inventory" />
        <div className="flex items-center justify-center h-96">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  const stats = (data?.stats as Record<string, number>) || {};
  const charts = (data?.charts as Record<string, unknown[]>) || {};
  const recentActivity = (data?.recentActivity as unknown[]) || [];
  const lowStockProducts = (data?.lowStockProducts as unknown[]) || [];

  return (
    <div>
      <Header
        title={`Welcome back, ${user?.name?.split(" ")[0]}`}
        subtitle="Here's what's happening with your inventory today."
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={stats.totalProducts || 0}
            subtitle="Active SKUs"
            icon={Package}
            color="indigo"
          />
          <StatCard
            title="Stock Value"
            value={formatCurrency(stats.totalStockValue || 0)}
            subtitle="Total inventory value"
            icon={DollarSign}
            color="emerald"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockCount || 0}
            subtitle={`${stats.outOfStockCount || 0} out of stock`}
            icon={AlertTriangle}
            color={(stats.lowStockCount || 0) > 0 ? "amber" : "emerald"}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders || 0}
            subtitle="Awaiting approval"
            icon={Clock}
            color={(stats.pendingOrders || 0) > 0 ? "red" : "indigo"}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Order Trend */}
          <Card className="lg:col-span-2">
            <CardHeader title="Order Activity" subtitle="Last 6 months" />
            <div className="p-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(charts.orderTrend as unknown[]) || []}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }}
                    labelStyle={{ color: "#e5e7eb" }}
                    itemStyle={{ color: "#818cf8" }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader title="By Category" subtitle="Product distribution" />
            <div className="p-4 h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(charts.categoryData as unknown[]) || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {((charts.categoryData as { name: string }[]) || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 pb-4 space-y-1.5">
              {((charts.categoryData as { name: string; count: number }[]) || []).slice(0, 4).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-gray-400">{cat.name}</span>
                  </div>
                  <span className="text-gray-300 font-medium">{cat.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader title="Low Stock Alerts" subtitle="Requires immediate attention" />
            <div className="divide-y divide-gray-800">
              {lowStockProducts.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  ✅ All products are sufficiently stocked
                </div>
              ) : (
                (lowStockProducts as Array<{
                  id: string; name: string; sku: string;
                  quantity: number; lowStockThreshold: number; category: string;
                }>).map((product) => {
                  const status = getStockStatus(product.quantity, product.lowStockThreshold);
                  return (
                    <div key={product.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku} · {product.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={status.color === "red" ? "red" : "yellow"}>
                          {status.label}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{product.quantity} left</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader title="Recent Activity" subtitle="Latest system events" />
            <div className="divide-y divide-gray-800">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No recent activity</div>
              ) : (
                (recentActivity as Array<{
                  id: string; action: string; createdAt: string;
                  user?: { name: string };
                }>).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-6 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300">{getActionLabel(log.action)}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {log.user?.name || "System"} · {timeAgo(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
