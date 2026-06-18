// app/api/stock/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  forbiddenResponse, notFoundResponse, serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const stockUpdateSchema = z.object({
  productId: z.string().min(1),
  change: z.number().int().refine((n) => n !== 0, "Change cannot be zero"),
  reason: z.string().min(3, "Please provide a reason for the stock change"),
});

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (!["ADMIN", "MANAGER"].includes(userRole || "")) return forbiddenResponse();

    const body = await request.json();
    const result = stockUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const { productId, change, reason } = result.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) return notFoundResponse("Product");

    const newQuantity = product.quantity + change;
    if (newQuantity < 0) {
      return errorResponse(
        `Cannot reduce stock below zero. Current stock: ${product.quantity}, attempted change: ${change}`
      );
    }

    // Run in a transaction
    const [updatedProduct, stockRecord] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { quantity: newQuantity },
      }),
      prisma.stockHistory.create({
        data: {
          productId,
          change,
          reason,
          previousQty: product.quantity,
          newQty: newQuantity,
          updatedBy: userId,
        },
      }),
    ]);

    await createLog({
      action: change > 0 ? "STOCK_INCREASED" : "STOCK_DECREASED",
      userId,
      targetId: productId,
      targetType: "product",
      meta: {
        productName: product.name,
        change,
        previousQty: product.quantity,
        newQty: newQuantity,
        reason,
      },
    });

    // Warn if now at or below low stock threshold
    const isLowStock = newQuantity <= product.lowStockThreshold;

    return successResponse(
      { product: updatedProduct, stockRecord, isLowStock },
      isLowStock
        ? `Stock updated. Warning: quantity is now at or below low stock threshold (${product.lowStockThreshold}).`
        : "Stock updated successfully"
    );
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where = productId ? { productId } : {};

    const [history, total] = await Promise.all([
      prisma.stockHistory.findMany({
        where,
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockHistory.count({ where }),
    ]);

    return successResponse({
      data: history,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
