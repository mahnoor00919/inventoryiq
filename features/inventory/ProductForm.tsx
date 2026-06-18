// features/inventory/ProductForm.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Input, Textarea } from "@/components/ui";
import { api } from "@/services/api.service";
import { toast } from "@/components/ToasterRoot";
import { generateSKU } from "@/lib/utils";
import type { Product, ProductForm as ProductFormType } from "@/types";

const CATEGORIES = [
  "Electronics", "Peripherals", "Accessories", "Furniture",
  "Audio", "Office Supplies", "Software", "Hardware", "Other"
];

interface Props {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormType>({
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          lowStockThreshold: product.lowStockThreshold,
          category: product.category,
          supplier: product.supplier,
          supplierEmail: product.supplierEmail,
          supplierPhone: product.supplierPhone,
        }
      : { quantity: 0, lowStockThreshold: 10 },
  });

  const name = watch("name");
  const category = watch("category");

  async function onSubmit(data: ProductFormType) {
    try {
      const payload = {
        ...data,
        price: Number(data.price),
        quantity: Number(data.quantity),
        lowStockThreshold: Number(data.lowStockThreshold),
      };

      const res = product
        ? await api.updateProduct(product.id, payload)
        : await api.createProduct(payload);

      if (res.success) {
        toast.success(
          product ? "Product updated" : "Product created",
          (res.data as { name: string })?.name
        );
        onSuccess();
      } else {
        toast.error("Save failed", res.error);
      }
    } catch {
      toast.error("Network error", "Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input
            label="Product Name *"
            placeholder="e.g. MacBook Pro 16-inch"
            {...register("name", { required: "Name is required", minLength: { value: 2, message: "Too short" } })}
            error={errors.name?.message}
          />
        </div>

        <div>
          <label className="form-label">SKU *</label>
          <div className="flex gap-2">
            <input
              className="form-input flex-1"
              placeholder="e.g. MBP-16-001"
              {...register("sku", { required: "SKU is required" })}
            />
            <button
              type="button"
              className="btn-secondary text-xs px-3 whitespace-nowrap rounded-lg"
              onClick={() => setValue("sku", generateSKU(category || "GEN", name || "PRD"))}
            >
              Auto
            </button>
          </div>
          {errors.sku && <p className="mt-1 text-xs text-red-400">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="form-label">Category *</label>
          <select
            className="form-input"
            {...register("category", { required: "Category is required" })}
          >
            <option value="" className="bg-gray-800">Select category...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-gray-800">{c}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category.message}</p>}
        </div>

        <Input
          label="Price (USD) *"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register("price", {
            required: "Price is required",
            min: { value: 0, message: "Price must be positive" },
          })}
          error={errors.price?.message}
        />

        <Input
          label="Initial Quantity *"
          type="number"
          min="0"
          placeholder="0"
          {...register("quantity", {
            required: "Quantity is required",
            min: { value: 0, message: "Cannot be negative" },
          })}
          error={errors.quantity?.message}
        />

        <Input
          label="Low Stock Threshold"
          type="number"
          min="0"
          placeholder="10"
          helperText="Alert when stock falls below this"
          {...register("lowStockThreshold", { min: 0 })}
          error={errors.lowStockThreshold?.message}
        />

        <Input
          label="Supplier Name"
          placeholder="e.g. Apple Inc."
          {...register("supplier")}
        />

        <Input
          label="Supplier Email"
          type="email"
          placeholder="supply@company.com"
          {...register("supplierEmail")}
          error={errors.supplierEmail?.message}
        />

        <Input
          label="Supplier Phone"
          placeholder="+1 (555) 000-0000"
          {...register("supplierPhone")}
        />

        <div className="col-span-2">
          <Textarea
            label="Description"
            placeholder="Optional product description..."
            {...register("description")}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {product ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
