export const dynamic = "force-dynamic";

// app/api/users/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  forbiddenResponse, notFoundResponse, serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "USER"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    if (!userId) return unauthorizedResponse();

    // Users can view themselves; admins can view anyone
    if (userRole !== "ADMIN" && userId !== params.id) return forbiddenResponse();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true, updatedAt: true,
        _count: { select: { orders: true } },
      },
    });

    if (!user) return notFoundResponse("User");
    return successResponse(user);
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
    if (userRole !== "ADMIN") return forbiddenResponse();

    // Prevent admin from deactivating themselves
    if (params.id === userId) {
      return errorResponse("You cannot modify your own account from this endpoint.");
    }

    const body = await request.json();
    const result = updateUserSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message);

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) return notFoundResponse("User");

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: result.data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    const action =
      result.data.isActive === false
        ? "USER_DEACTIVATED"
        : result.data.isActive === true
        ? "USER_ACTIVATED"
        : "USER_UPDATED";

    await createLog({
      action,
      userId,
      targetId: params.id,
      targetType: "user",
      meta: { email: existing.email, changes: result.data },
    });

    return successResponse(updated, "User updated successfully");
  } catch (error) {
    return serverErrorResponse(error);
  }
}
