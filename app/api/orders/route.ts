// app/api/orders/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const orderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Users only see their own orders; admins/managers see all
    const where = {
      ...(!["ADMIN", "MANAGER"].includes(userRole || "") && { userId }),
      ...(status && { status: status as "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED" }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, sku: true, price: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return successResponse({
      data: orders,
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
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const result = orderSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const { productId, quantity, notes } = result.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return errorResponse("Product not found or unavailable.");
    }

    const order = await prisma.order.create({
      data: { userId, productId, quantity, notes },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true } },
      },
    });

    await createLog({
      action: "ORDER_CREATED",
      userId,
      targetId: order.id,
      targetType: "order",
      meta: { productName: product.name, quantity },
    });

    return successResponse(order, "Order request submitted successfully", 201);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
