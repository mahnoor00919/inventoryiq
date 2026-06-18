// app/api/products/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  forbiddenResponse, notFoundResponse, serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  category: z.string().min(1).optional(),
  supplier: z.string().optional(),
  supplierEmail: z.string().email().optional().or(z.literal("")),
  supplierPhone: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return unauthorizedResponse();

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        stockHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!product || !product.isActive) return notFoundResponse("Product");

    return successResponse(product);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (!["ADMIN", "MANAGER"].includes(userRole || "")) return forbiddenResponse();

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing || !existing.isActive) return notFoundResponse("Product");

    const product = await prisma.product.update({
      where: { id: params.id },
      data: result.data,
    });

    await createLog({
      action: "PRODUCT_UPDATED",
      userId,
      targetId: product.id,
      targetType: "product",
      meta: { name: product.name, updatedFields: Object.keys(result.data) },
    });

    return successResponse(product, "Product updated successfully");
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (userRole !== "ADMIN") return forbiddenResponse();

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing || !existing.isActive) return notFoundResponse("Product");

    // Soft delete
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await createLog({
      action: "PRODUCT_DELETED",
      userId,
      targetId: params.id,
      targetType: "product",
      meta: { name: existing.name, sku: existing.sku },
    });

    return successResponse(null, "Product deleted successfully");
  } catch (error) {
    return serverErrorResponse(error);
  }
}
