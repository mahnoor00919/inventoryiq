export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import { sendOrderStatusEmail } from "@/lib/email";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "FULFILLED"]),
  notes: z.string().optional(),
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId   = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    if (!userId) return unauthorizedResponse();

    const order = await prisma.order.findUnique({
      where:   { id: params.id },
      include: {
        user:    { select: { id: true, name: true, email: true } },
        product: true,
      },
    });

    if (!order) return notFoundResponse("Order");

    if (
      !["ADMIN", "MANAGER"].includes(userRole || "") &&
      order.userId !== userId
    ) {
      return forbiddenResponse();
    }

    return successResponse(order);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// ── PATCH /api/orders/:id  (approve / reject / fulfill) ──────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId   = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (!["ADMIN", "MANAGER"].includes(userRole || "")) return forbiddenResponse();

    const body   = await request.json();
    const result = reviewSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message);

    const { status } = result.data;

    // Fetch order with both product AND user included
    const order = await prisma.order.findUnique({
      where:   { id: params.id },
      include: {
        product: true,
        user:    { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) return notFoundResponse("Order");

    // Normalise status from DB — trim whitespace + uppercase
    // (guards against any trailing whitespace SQLite may have stored)
    const dbStatus = String(order.status ?? "").trim().toUpperCase();

    console.log(`[ORDER REVIEW] orderId=${params.id} dbStatus="${dbStatus}" → "${status}"`);

    if (dbStatus !== "PENDING") {
      return errorResponse(
        `Only PENDING orders can be reviewed. Current status: ${dbStatus}`
      );
    }

    // Stock check
    if ((status === "APPROVED" || status === "FULFILLED") && order.product.quantity < order.quantity) {
      return errorResponse(
        `Insufficient stock. Available: ${order.product.quantity}, Requested: ${order.quantity}`
      );
    }

    // ── Transaction ────────────────────────────────────────────────────────────
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update the order status
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          status,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, price: true } },
          user:    { select: { id: true, name: true, email: true } },
        },
      });

      // 2. Deduct stock only when approving or fulfilling
      if (status === "APPROVED" || status === "FULFILLED") {
        const newQty = order.product.quantity - order.quantity;

        await tx.product.update({
          where: { id: order.productId },
          data:  { quantity: newQty },
        });

        // 3. Write stock history record
        await tx.stockHistory.create({
          data: {
            productId:   order.productId,
            change:      -order.quantity,
            reason:      `Order #${params.id.slice(-8).toUpperCase()} ${status.toLowerCase()}`,
            previousQty: order.product.quantity,
            newQty:      newQty,
            updatedBy:   userId,
          },
        });
      }

      return updated;
    });

    // ── Audit log ──────────────────────────────────────────────────────────────
    await createLog({
      action:     status === "APPROVED" ? "ORDER_APPROVED"
                : status === "REJECTED" ? "ORDER_REJECTED"
                : "ORDER_FULFILLED",
      userId,
      targetId:   params.id,
      targetType: "order",
      meta: {
        productName: order.product.name,
        quantity:    order.quantity,
        requestedBy: order.userId,
      },
    });

    // ── Email requester (fire-and-forget) ──────────────────────────────────────
    if (order.user?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      sendOrderStatusEmail({
        userEmail:   order.user.email,
        userName:    order.user.name,
        productName: order.product.name,
        quantity:    order.quantity,
        status,
        reviewUrl:   `${appUrl}/user/requests`,
      }).catch((err) => console.error("Status email error:", err));
    }

    return successResponse(updatedOrder, `Order ${status.toLowerCase()} successfully`);
  } catch (error) {
    return serverErrorResponse(error);
  }
}