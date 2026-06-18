"use client";
// app/(dashboard)/user/requests/page.tsx
import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, RefreshCw, Clock, CheckCircle2, XCircle, PackageCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge, Card, Button, Spinner, EmptyState } from "@/components/ui";
import { toast } from "@/components/ToasterRoot";
import { api } from "@/services/api.service";
import { formatCurrency, formatDateTime, timeAgo } from "@/lib/utils";
import type { Order } from "@/types";

const STATUS_META = {
  PENDING:   { label: "Pending Review", variant: "yellow" as const, icon: Clock,         desc: "Waiting for admin approval" },
  APPROVED:  { label: "Approved",       variant: "green"  as const, icon: CheckCircle2,  desc: "Approved — pending fulfillment" },
  REJECTED:  { label: "Rejected",       variant: "red"    as const, icon: XCircle,        desc: "Request was not approved" },
  FULFILLED: { label: "Fulfilled",      variant: "blue"   as const, icon: PackageCheck,   desc: "Item has been delivered" },
};

const FILTER_OPTIONS = [
  { label: "All Requests", value: "" },
  { label: "Pending",      value: "PENDING" },
  { label: "Approved",     value: "APPROVED" },
  { label: "Rejected",     value: "REJECTED" },
  { label: "Fulfilled",    value: "FULFILLED" },
];

export default function RequestsPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({ status: filter, page });
      if (res.success) {
        const d = res.data as { data: Order[]; total: number };
        setOrders(d.data);
        setTotal(d.total);
      }
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Summary counts
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <Header title="My Requests" subtitle="Track the status of your product requests" />
      <div className="p-6 space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(["PENDING","APPROVED","REJECTED","FULFILLED"] as const).map(status => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            return (
              <div key={status} className="stat-card flex items-center gap-4 cursor-pointer hover:border-gray-700 transition-colors"
                onClick={() => { setFilter(status); setPage(1); }}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                  ${status==="PENDING"?"bg-amber-500/10":status==="APPROVED"?"bg-emerald-500/10":
                    status==="REJECTED"?"bg-red-500/10":"bg-indigo-500/10"}`}>
                  <Icon className={`h-5 w-5 ${status==="PENDING"?"text-amber-400":status==="APPROVED"?"text-emerald-400":
                    status==="REJECTED"?"text-red-400":"text-indigo-400"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{counts[status] || 0}</p>
                  <p className="text-xs text-gray-500">{meta.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <Card>
          <div className="card-header">
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFilter(f.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${filter === f.value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={fetchOrders}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Spinner /></div>
            ) : orders.length === 0 ? (
              <EmptyState
                title="No requests found"
                description={filter ? "No requests match this filter." : "You haven't made any requests yet."}
                action={
                  !filter ? (
                    <Button size="sm" onClick={() => window.location.href="/user/catalog"}>
                      <ShoppingCart className="h-3.5 w-3.5" /> Browse Catalog
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th>Request ID</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Est. Value</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const product = order.product as { name: string; sku: string; price: number } | undefined;
                    const meta    = STATUS_META[order.status];
                    return (
                      <tr key={order.id}>
                        <td>
                          <code className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                            #{order.id.slice(-8).toUpperCase()}
                          </code>
                        </td>
                        <td>
                          <p className="font-medium text-gray-200">{product?.name ?? "—"}</p>
                          <p className="text-xs text-gray-500">{product?.sku}</p>
                        </td>
                        <td className="font-mono font-bold text-gray-100">{order.quantity}</td>
                        <td className="font-mono text-gray-300">
                          {product?.price != null ? formatCurrency(product.price * order.quantity) : "—"}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">{meta.desc}</p>
                        </td>
                        <td className="text-gray-500 text-xs">{timeAgo(order.createdAt)}</td>
                        <td className="text-gray-500 text-xs">{formatDateTime(order.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">{total} total requests</p>
              <div className="flex gap-2 items-center">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p-1)} disabled={page===1}>Prev</Button>
                <span className="text-xs text-gray-400">{page}/{totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
