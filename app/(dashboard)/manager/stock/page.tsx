// app/(dashboard)/manager/stock/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Plus, Minus, History } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button, Badge, Card, CardHeader, Modal, Input, Spinner, EmptyState } from "@/components/ui";
import { api } from "@/services/api.service";
import { toast } from "@/components/ToasterRoot";
import { formatCurrency, formatDateTime, getStockStatus } from "@/lib/utils";
import type { Product, StockHistory } from "@/types";
import { useForm } from "react-hook-form";

interface StockUpdateForm {
  productId: string;
  change: number;
  reason: string;
  type: "increase" | "decrease";
}

function StockUpdateModal({
  product,
  type,
  onClose,
  onSuccess,
}: {
  product: Product;
  type: "increase" | "decrease";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StockUpdateForm>({
    defaultValues: { productId: product.id, type },
  });

  async function onSubmit(data: StockUpdateForm) {
    const change = type === "increase" ? Number(data.change) : -Number(data.change);

    if (type === "decrease" && Math.abs(change) > product.quantity) {
      toast.error("Cannot decrease below zero", `Current stock: ${product.quantity}`);
      return;
    }

    try {
      const res = await api.updateStock({
        productId: product.id,
        change,
        reason: data.reason,
      });

      if (res.success) {
        const msg = (res.data as { isLowStock?: boolean })?.isLowStock
          ? "⚠️ Stock updated — now at low stock level"
          : "Stock updated successfully";
        toast.success("Stock updated", msg);
        onSuccess();
        onClose();
      } else {
        toast.error("Update failed", res.error);
      }
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
        <p className="text-xs text-gray-400">Product</p>
        <p className="font-medium text-gray-200">{product.name}</p>
        <p className="text-xs text-gray-500">{product.sku} · Current stock: {product.quantity}</p>
      </div>

      <Input
        label={`Quantity to ${type === "increase" ? "Add" : "Remove"} *`}
        type="number"
        min="1"
        placeholder="Enter quantity"
        {...register("change", {
          required: "Quantity is required",
          min: { value: 1, message: "Must be at least 1" },
        })}
        error={errors.change?.message}
      />

      <div>
        <label className="form-label">Reason *</label>
        <select
          className="form-input"
          {...register("reason", { required: "Reason is required" })}
        >
          <option value="" className="bg-gray-800">Select reason...</option>
          {type === "increase" ? (
            <>
              <option value="Purchase order received" className="bg-gray-800">Purchase order received</option>
              <option value="Inventory adjustment" className="bg-gray-800">Inventory adjustment</option>
              <option value="Return from customer" className="bg-gray-800">Return from customer</option>
              <option value="Transfer from warehouse" className="bg-gray-800">Transfer from warehouse</option>
            </>
          ) : (
            <>
              <option value="Sold to customer" className="bg-gray-800">Sold to customer</option>
              <option value="Damaged/defective" className="bg-gray-800">Damaged / Defective</option>
              <option value="Inventory adjustment" className="bg-gray-800">Inventory adjustment</option>
              <option value="Internal use" className="bg-gray-800">Internal use</option>
              <option value="Loss/theft" className="bg-gray-800">Loss / Theft</option>
            </>
          )}
        </select>
        {errors.reason && <p className="mt-1 text-xs text-red-400">{errors.reason.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant={type === "increase" ? "success" : "danger"}
          isLoading={isSubmitting}
        >
          {type === "increase" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {type === "increase" ? "Add Stock" : "Remove Stock"}
        </Button>
      </div>
    </form>
  );
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updateType, setUpdateType] = useState<"increase" | "decrease">("increase");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsRes, historyRes] = await Promise.all([
        api.getProducts({ pageSize: 100 }),
        api.getStockHistory(),
      ]);

      if (productsRes.success) {
        setProducts((productsRes.data as { data: Product[] }).data);
      }
      if (historyRes.success) {
        setHistory((historyRes.data as { data: StockHistory[] }).data);
      }
    } catch {
      toast.error("Failed to load stock data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const lowStockProducts = products.filter((p) => p.quantity <= p.lowStockThreshold);

  if (isLoading) {
    return (
      <div>
        <Header title="Stock Control" />
        <div className="flex items-center justify-center h-96"><Spinner className="h-8 w-8" /></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Stock Control" subtitle="Monitor and adjust inventory levels" />

      <div className="p-6 space-y-4">
        {/* Alert Banner */}
        {lowStockProducts.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-amber-400 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-400">
                {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} at low stock
              </p>
              <p className="text-xs text-amber-500/80">
                {lowStockProducts.map((p) => p.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Products Table */}
        <Card>
          <CardHeader title="Inventory Levels" subtitle="Adjust stock by product" />
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-gray-800">
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const status = getStockStatus(product.quantity, product.lowStockThreshold);
                  return (
                    <tr key={product.id}>
                      <td className="font-medium text-gray-200">{product.name}</td>
                      <td>
                        <code className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                          {product.sku}
                        </code>
                      </td>
                      <td><Badge variant="blue">{product.category}</Badge></td>
                      <td className="font-mono">{formatCurrency(product.price)}</td>
                      <td>
                        <span className={`font-bold ${product.quantity === 0 ? "text-red-400" : product.quantity <= product.lowStockThreshold ? "text-amber-400" : "text-gray-200"}`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="text-gray-500">{product.lowStockThreshold}</td>
                      <td>
                        <Badge variant={status.color === "green" ? "green" : status.color === "yellow" ? "yellow" : "red"}>
                          {status.label}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => { setSelectedProduct(product); setUpdateType("increase"); }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => { setSelectedProduct(product); setUpdateType("decrease"); }}
                            disabled={product.quantity === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Stock History */}
        <Card>
          <CardHeader title="Stock History" subtitle="Recent inventory changes" />
          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <EmptyState title="No stock history" description="Stock changes will appear here." />
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th>Product</th>
                    <th>Change</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Reason</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <p className="font-medium text-gray-200">
                          {(record as unknown as { product?: { name: string } }).product?.name || "—"}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {record.change > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          )}
                          <span className={`font-mono font-bold ${record.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {record.change > 0 ? "+" : ""}{record.change}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-gray-400">{record.previousQty}</td>
                      <td className="font-mono text-gray-200">{record.newQty}</td>
                      <td className="text-gray-400 text-xs">{record.reason || "—"}</td>
                      <td className="text-gray-500 text-xs">{formatDateTime(record.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Stock Update Modal */}
      {selectedProduct && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          title={`${updateType === "increase" ? "Add" : "Remove"} Stock — ${selectedProduct.name}`}
        >
          <StockUpdateModal
            product={selectedProduct}
            type={updateType}
            onClose={() => setSelectedProduct(null)}
            onSuccess={fetchData}
          />
        </Modal>
      )}
    </div>
  );
}
