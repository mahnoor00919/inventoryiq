// app/(dashboard)/manager/products/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Filter, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  Button, Badge, Card, Input, Select, Modal,
  ConfirmDialog, EmptyState, Spinner
} from "@/components/ui";
import { api } from "@/services/api.service";
import { toast } from "@/components/ToasterRoot";
import { formatCurrency, formatDate, getStockStatus } from "@/lib/utils";
import type { Product } from "@/types";
import { ProductForm } from "@/features/inventory/ProductForm";

const CATEGORIES = [
  { label: "All Categories", value: "" },
  { label: "Electronics", value: "Electronics" },
  { label: "Peripherals", value: "Peripherals" },
  { label: "Accessories", value: "Accessories" },
  { label: "Furniture", value: "Furniture" },
  { label: "Audio", value: "Audio" },
  { label: "Office Supplies", value: "Office Supplies" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const PAGE_SIZE = 15;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getProducts({ page, pageSize: PAGE_SIZE, search, category });
      if (res.success && res.data) {
        const data = res.data as { data: Product[]; total: number };
        setProducts(data.data);
        setTotal(data.total);
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  async function handleDelete() {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteProduct(deletingProduct.id);
      if (res.success) {
        toast.success("Product deleted", deletingProduct.name);
        setDeletingProduct(null);
        fetchProducts();
      } else {
        toast.error("Delete failed", res.error);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <Header title="Products" subtitle="Manage your product catalog" />

      <div className="p-6 space-y-4">
        <Card>
          {/* Toolbar */}
          <div className="card-header">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name, SKU, or supplier..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="form-input pl-9"
                />
              </div>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="form-input w-48"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-gray-800">{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchProducts}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Spinner />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                title="No products found"
                description={search ? "Try a different search term." : "Add your first product to get started."}
                action={
                  <Button size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add Product
                  </Button>
                }
              />
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Supplier</th>
                    <th>Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product.quantity, product.lowStockThreshold);
                    return (
                      <tr key={product.id}>
                        <td>
                          <div>
                            <p className="font-medium text-gray-200">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <code className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                            {product.sku}
                          </code>
                        </td>
                        <td>
                          <Badge variant="blue">{product.category}</Badge>
                        </td>
                        <td className="font-mono text-gray-200">{formatCurrency(product.price)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200">{product.quantity}</span>
                            {product.quantity <= product.lowStockThreshold && (
                              <span className="text-amber-400 text-xs">⚠</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge variant={status.color === "green" ? "green" : status.color === "yellow" ? "yellow" : "red"}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="text-gray-400">{product.supplier || "—"}</td>
                        <td className="text-gray-500 text-xs">{formatDate(product.createdAt)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => setDeletingProduct(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-400">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || !!editingProduct}
        onClose={() => { setShowAddModal(false); setEditingProduct(null); }}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        size="lg"
      >
        <ProductForm
          product={editingProduct}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingProduct(null);
            fetchProducts();
          }}
          onCancel={() => { setShowAddModal(false); setEditingProduct(null); }}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
        isLoading={isDeleting}
      />
    </div>
  );
}
