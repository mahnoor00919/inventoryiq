export const dynamic = "force-dynamic";

// app/api/orders/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import { sendNewOrderNotification } from "@/lib/email";
import {
  successResponse, errorResponse, unauthorizedResponse, serverErrorResponse,
} from "@/lib/api-response";
import { z } from "zod";

const orderSchema = z.object({
  productId: z.string().min(1),
  quantity:  z.number().int().positive("Quantity must be a positive integer"),
  notes:     z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId   = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status   = searchParams.get("status");
    const page     = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where = {
      ...(!["ADMIN", "MANAGER"].includes(userRole || "") && { userId }),
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user:    { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, sku: true, price: true } },
        },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return successResponse({
      data: orders, total, page, pageSize,
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

    const body   = await request.json();
    const result = orderSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message);

    const { productId, quantity, notes } = result.data;

    // Validate product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) return errorResponse("Product not found or unavailable.");

    // Get requester info
    const requester = await prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true, email: true },
    });

    // Create the order
    const order = await prisma.order.create({
      data: { userId, productId, quantity, notes, status: "PENDING" },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true } },
      },
    });

    await createLog({
      action:     "ORDER_CREATED",
      userId,
      targetId:   order.id,
      targetType: "order",
      meta:       { productName: product.name, quantity },
    });

    // ── Send email to ALL admins ────────────────────────────────────────────
    // const admins = await prisma.user.findMany({
    //   where:  { role: "ADMIN", isActive: true },
    //   select: { name: true, email: true },
    // });

    // const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // const reviewUrl = `${appUrl}/manager/orders`;

    // // Fire-and-forget — don't block the response
    // Promise.all(
    //   admins.map((admin) =>
    //     sendNewOrderNotification({
    //       adminEmail:     admin.email,
    //       adminName:      admin.name,
    //       requesterName:  requester?.name  || "A team member",
    //       requesterEmail: requester?.email || "",
    //       productName:    product.name,
    //       productSku:     product.sku,
    //       quantity,
    //       unitPrice:      product.price,
    //       notes,
    //       orderId:        order.id,
    //       reviewUrl,
    //     })
    //   )
    // ).catch((err) => console.error("Email dispatch error:", err));

    // Send email to one admin only
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const reviewUrl = `${appUrl}/manager/orders`;

sendNewOrderNotification({
  adminEmail: "manoo99777@gmail.com", // your email
  adminName: "Mahnoor",
  requesterName: requester?.name || "A team member",
  requesterEmail: requester?.email || "",
  productName: product.name,
  productSku: product.sku,
  quantity,
  unitPrice: product.price,
  notes,
  orderId: order.id,
  reviewUrl,
}).catch((err) => console.error("Email dispatch error:", err));

    return successResponse(order, "Order request submitted. Admin has been notified.", 201);
  } catch (error) {
    return serverErrorResponse(error);
  }
}