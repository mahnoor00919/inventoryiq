// app/api/orders/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  forbiddenResponse, notFoundResponse, serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "FULFILLED"]),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    if (!userId) return unauthorizedResponse();

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: true,
      },
    });

    if (!order) return notFoundResponse("Order");

    // Users can only view their own orders
    if (!["ADMIN", "MANAGER"].includes(userRole || "") && order.userId !== userId) {
      return forbiddenResponse();
    }

    return successResponse(order);
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
    const result = reviewSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const { status } = result.data;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { product: true },
    });

    if (!order) return notFoundResponse("Order");
    if (order.status !== "PENDING") {
      return errorResponse("Only pending orders can be reviewed.");
    }

    // If approving, verify sufficient stock
    if (status === "APPROVED" || status === "FULFILLED") {
      if (order.product.quantity < order.quantity) {
        return errorResponse(
          `Insufficient stock. Available: ${order.product.quantity}, Requested: ${order.quantity}`
        );
      }
    }

    // Run in transaction: update order + deduct stock if approved/fulfilled
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          status,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, price: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (status === "APPROVED" || status === "FULFILLED") {
        const newQty = order.product.quantity - order.quantity;
        await tx.product.update({
          where: { id: order.productId },
          data: { quantity: newQty },
        });

        await tx.stockHistory.create({
          data: {
            productId: order.productId,
            change: -order.quantity,
            reason: `Order ${params.id} ${status.toLowerCase()}`,
            previousQty: order.product.quantity,
            newQty,
            updatedBy: userId,
          },
        });
      }

      return updated;
    });

    const logAction =
      status === "APPROVED"
        ? "ORDER_APPROVED"
        : status === "REJECTED"
        ? "ORDER_REJECTED"
        : "ORDER_FULFILLED";

    await createLog({
      action: logAction,
      userId,
      targetId: params.id,
      targetType: "order",
      meta: {
        productName: order.product.name,
        quantity: order.quantity,
        requestedBy: order.userId,
      },
    });

    return successResponse(updatedOrder, `Order ${status.toLowerCase()} successfully`);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
