export const dynamic = "force-dynamic";

// app/api/products/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  forbiddenResponse, serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().min(2).max(50),
  description: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  category: z.string().min(1),
  supplier: z.string().optional(),
  supplierEmail: z.string().email().optional().or(z.literal("")),
  supplierPhone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";

    const baseWhere = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { category: { contains: search } },
          { supplier: { contains: search } },
        ],
      }),
      ...(category && { category }),
    };

    const allProducts = await prisma.product.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
    });

    const filteredProducts = lowStock
      ? allProducts.filter((p) => p.quantity <= p.lowStockThreshold)
      : allProducts;

    const total = filteredProducts.length;
    const pagedProducts = filteredProducts.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return successResponse({
      data: pagedProducts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (!["ADMIN", "MANAGER"].includes(userRole || "")) return forbiddenResponse();

    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const existing = await prisma.product.findUnique({
      where: { sku: result.data.sku },
    });

    if (existing) {
      return errorResponse("A product with this SKU already exists.");
    }

    const product = await prisma.product.create({
      data: result.data,
    });

    // Log initial stock
    if (product.quantity > 0) {
      await prisma.stockHistory.create({
        data: {
          productId: product.id,
          change: product.quantity,
          reason: "Initial stock on product creation",
          previousQty: 0,
          newQty: product.quantity,
          updatedBy: userId,
        },
      });
    }

    await createLog({
      action: "PRODUCT_CREATED",
      userId,
      targetId: product.id,
      targetType: "product",
      meta: { name: product.name, sku: product.sku },
    });

    return successResponse(product, "Product created successfully", 201);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
