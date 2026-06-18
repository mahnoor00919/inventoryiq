"use client";
// app/(dashboard)/user/catalog/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, ShoppingCart, PackageCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge, Card, Button, Modal, Spinner, EmptyState } from "@/components/ui";
import { toast } from "@/components/ToasterRoot";
import { api } from "@/services/api.service";
import { formatCurrency, getStockStatus } from "@/lib/utils";
import type { Product } from "@/types";

function RequestModal({
  product,
  onClose,
  onSuccess,
}: { product: Product; onClose: () => void; onSuccess: () => void }) {
  const [qty, setQty]     = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const maxQty = product.quantity;
  const total  = product.price * qty;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (qty < 1 || qty > maxQty) return;
    setSaving(true);
    try {
      const res = await api.createOrder({ productId: product.id, quantity: qty, notes });
      if (res.success) {
        toast.success("Request submitted!", "An admin will review it shortly.");
        onSuccess();
        onClose();
      } else {
        toast.error("Failed", res.error);
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
        <p className="font-semibold text-gray-100">{product.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{product.sku} · {product.category}</p>
        <p className="text-lg font-bold text-indigo-400 mt-2">{formatCurrency(product.price)}</p>
        <p className="text-xs text-gray-500">{product.quantity} units available</p>
      </div>

      <div>
        <label className="form-label">Quantity *</label>
        <input
          type="number" min={1} max={maxQty}
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
          className="form-input"
        />
        {qty > maxQty && <p className="mt-1 text-xs text-red-400">Exceeds available stock ({maxQty})</p>}
        {qty > 0 && qty <= maxQty && (
          <p className="mt-1 text-xs text-gray-500">Estimated total: {formatCurrency(total)}</p>
        )}
      </div>

      <div>
        <label className="form-label">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Reason for request, urgency, project details…"
          className="form-input resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={saving} disabled={qty < 1 || qty > maxQty}>
          <ShoppingCart className="h-3.5 w-3.5" /> Submit Request
        </Button>
      </div>
    </form>
  );
}

const CATEGORIES = ["", "Electronics","Peripherals","Accessories","Furniture","Audio","Office Supplies"];

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage]         = useState(1);
  const [requesting, setRequesting] = useState<Product | null>(null);
  const PAGE_SIZE = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProducts({ page, pageSize: PAGE_SIZE, search, category });
      if (res.success) {
        const d = res.data as { data: Product[]; total: number };
        setProducts(d.data);
        setTotal(d.total);
      }
    } catch { toast.error("Failed to load catalog"); }
    finally { setLoading(false); }
  }, [page, search, category]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <Header title="Product Catalog" subtitle="Browse available products and submit requests" />
      <div className="p-6 space-y-4">

        {/* Search + filter bar */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products…"
              className="form-input pl-9"
            />
          </div>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="form-input w-48"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-gray-800">{c || "All Categories"}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 whitespace-nowrap">{total} products</p>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64"><Spinner /></div>
        ) : products.length === 0 ? (
          <EmptyState title="No products found" description="Try a different search term." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => {
              const status = getStockStatus(product.quantity, product.lowStockThreshold);
              const outOfStock = product.quantity === 0;
              return (
                <div key={product.id}
                  className="card flex flex-col hover:border-gray-700 transition-colors">
                  {/* Color band */}
                  <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-indigo-600 to-violet-600" />

                  <div className="p-4 flex-1 flex flex-col gap-3">
                    {/* Category + status */}
                    <div className="flex items-center justify-between">
                      <Badge variant="blue">{product.category}</Badge>
                      <Badge variant={status.color === "green" ? "green" : status.color === "yellow" ? "yellow" : "red"}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-100 leading-snug">{product.name}</h3>
                      <code className="text-[10px] text-gray-500">{product.sku}</code>
                      {product.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                      )}
                    </div>

                    {/* Price + stock */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-gray-100">{formatCurrency(product.price)}</p>
                        <p className="text-xs text-gray-500">{product.quantity} in stock</p>
                      </div>
                      {product.supplier && (
                        <p className="text-[10px] text-gray-600 text-right max-w-[100px] truncate">
                          {product.supplier}
                        </p>
                      )}
                    </div>

                    {/* Request button */}
                    <Button
                      className="w-full"
                      disabled={outOfStock}
                      onClick={() => setRequesting(product)}
                    >
                      {outOfStock ? (
                        <><PackageCheck className="h-3.5 w-3.5" /> Out of Stock</>
                      ) : (
                        <><ShoppingCart className="h-3.5 w-3.5" /> Request</>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p-1)} disabled={page===1}>← Prev</Button>
            <span className="text-sm text-gray-400">{page} of {totalPages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>Next →</Button>
          </div>
        )}
      </div>

      {requesting && (
        <Modal isOpen title={`Request: ${requesting.name}`} onClose={() => setRequesting(null)}>
          <RequestModal product={requesting} onClose={() => setRequesting(null)} onSuccess={fetchProducts} />
        </Modal>
      )}
    </div>
  );
}
