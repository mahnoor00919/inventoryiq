"use client";
// app/(dashboard)/manager/orders/page.tsx
import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Package, Clock, Filter, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge, Card, CardHeader, Button, Modal, Spinner, EmptyState } from "@/components/ui";
import { toast } from "@/components/ToasterRoot";
import { api } from "@/services/api.service";
import { formatCurrency, formatDateTime, timeAgo } from "@/lib/utils";
import type { Order } from "@/types";

const STATUS_OPTIONS = [
  { label: "All Orders", value: "" },
  { label: "Pending",    value: "PENDING" },
  { label: "Approved",   value: "APPROVED" },
  { label: "Rejected",   value: "REJECTED" },
  { label: "Fulfilled",  value: "FULFILLED" },
];

const STATUS_BADGE: Record<string, { variant: "yellow"|"green"|"red"|"blue"|"gray", label: string }> = {
  PENDING:   { variant: "yellow", label: "Pending" },
  APPROVED:  { variant: "green",  label: "Approved" },
  REJECTED:  { variant: "red",    label: "Rejected" },
  FULFILLED: { variant: "blue",   label: "Fulfilled" },
};

function OrderDetailModal({
  order,
  onClose,
  onAction,
}: {
  order: Order;
  onClose: () => void;
  onAction: (id: string, status: "APPROVED" | "REJECTED" | "FULFILLED") => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const product = order.product as { name: string; sku: string; price: number } | undefined;
  const user = order.user as { name: string; email: string } | undefined;

  async function act(status: "APPROVED" | "REJECTED" | "FULFILLED") {
    setLoading(status);
    await onAction(order.id, status);
    setLoading(null);
  }

  const isPending = order.status === "PENDING";
  const isApproved = order.status === "APPROVED";

  return (
    <div className="space-y-4">
      {/* Order summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 col-span-2">
          <p className="text-xs text-gray-500 mb-0.5">Product</p>
          <p className="font-semibold text-gray-100">{product?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{product?.sku} · {product?.price != null ? formatCurrency(product.price) : "—"}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-xs text-gray-500 mb-0.5">Requested by</p>
          <p className="text-sm font-medium text-gray-200">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-xs text-gray-500 mb-0.5">Quantity · Total</p>
          <p className="text-sm font-bold text-gray-100">{order.quantity} units</p>
          <p className="text-xs text-gray-500">
            {product?.price != null ? formatCurrency(product.price * order.quantity) : "—"} estimated
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-xs text-gray-500 mb-0.5">Status</p>
          <Badge variant={STATUS_BADGE[order.status]?.variant ?? "gray"}>
            {STATUS_BADGE[order.status]?.label ?? order.status}
          </Badge>
        </div>
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-xs text-gray-500 mb-0.5">Requested</p>
          <p className="text-sm text-gray-300">{timeAgo(order.createdAt)}</p>
          <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      {order.notes && (
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Notes from requester</p>
          <p className="text-sm text-gray-300">{order.notes}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-3 pt-2 border-t border-gray-800">
          <Button variant="danger" className="flex-1" isLoading={loading === "REJECTED"}
            onClick={() => act("REJECTED")}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button variant="success" className="flex-1" isLoading={loading === "APPROVED"}
            onClick={() => act("APPROVED")}>
            <CheckCircle className="h-4 w-4" /> Approve
          </Button>
        </div>
      )}
      {isApproved && (
        <div className="flex gap-3 pt-2 border-t border-gray-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button variant="primary" className="flex-1" isLoading={loading === "FULFILLED"}
            onClick={() => act("FULFILLED")}>
            <Package className="h-4 w-4" /> Mark Fulfilled
          </Button>
        </div>
      )}
      {!isPending && !isApproved && (
        <div className="flex justify-end pt-2 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const PAGE_SIZE = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({ status: statusFilter, page });
      if (res.success) {
        const d = res.data as { data: Order[]; total: number };
        setOrders(d.data);
        setTotal(d.total);
      }
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleAction(id: string, status: "APPROVED" | "REJECTED" | "FULFILLED") {
    const res = await api.reviewOrder(id, status);
    if (res.success) {
      toast.success(`Order ${status.toLowerCase()}`, "The order status has been updated.");
      setSelected(null);
      fetchOrders();
    } else {
      toast.error("Action failed", res.error);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pendingCount = orders.filter(o => o.status === "PENDING").length;

  return (
    <div>
      <Header title="Orders" subtitle="Review and manage inventory requests" />
      <div className="p-6 space-y-4">
        {pendingCount > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-400">
              <span className="font-bold">{pendingCount}</span> order{pendingCount > 1 ? "s" : ""} awaiting review on this page
            </p>
          </div>
        )}

        <Card>
          <div className="card-header">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setStatusFilter(s.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${statusFilter === s.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchOrders}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Spinner /></div>
            ) : orders.length === 0 ? (
              <EmptyState title="No orders found" description="Try a different status filter." />
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th>Order ID</th>
                    <th>Requester</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Est. Value</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const product = order.product as { name: string; sku: string; price: number } | undefined;
                    const user    = order.user    as { name: string } | undefined;
                    const sb      = STATUS_BADGE[order.status] ?? { variant: "gray" as const, label: order.status };
                    return (
                      <tr key={order.id} className="cursor-pointer" onClick={() => setSelected(order)}>
                        <td>
                          <code className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                            {order.id.slice(-8).toUpperCase()}
                          </code>
                        </td>
                        <td className="font-medium text-gray-200">{user?.name ?? "—"}</td>
                        <td>
                          <p className="text-gray-200">{product?.name ?? "—"}</p>
                          <p className="text-xs text-gray-500">{product?.sku}</p>
                        </td>
                        <td className="font-mono font-bold text-gray-100">{order.quantity}</td>
                        <td className="font-mono text-gray-300">
                          {product?.price != null ? formatCurrency(product.price * order.quantity) : "—"}
                        </td>
                        <td><Badge variant={sb.variant}>{sb.label}</Badge></td>
                        <td className="text-gray-500 text-xs">{timeAgo(order.createdAt)}</td>
                        <td>
                          <div className="flex justify-end">
                            <Button size="sm" variant={order.status === "PENDING" ? "primary" : "secondary"}
                              onClick={(e) => { e.stopPropagation(); setSelected(order); }}>
                              {order.status === "PENDING" ? "Review" : "View"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">Showing page {page} of {totalPages} ({total} total)</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</Button>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {selected && (
        <Modal isOpen title={`Order #${selected.id.slice(-8).toUpperCase()}`} onClose={() => setSelected(null)}>
          <OrderDetailModal order={selected} onClose={() => setSelected(null)} onAction={handleAction} />
        </Modal>
      )}
    </div>
  );
}
