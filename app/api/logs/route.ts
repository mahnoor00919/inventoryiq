// app/api/logs/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (userRole !== "ADMIN") return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where = {
      ...(action && { action: action as Parameters<typeof prisma.activityLog.findMany>[0]["where"] extends { action?: infer A } ? A : never }),
      ...(targetType && { targetType }),
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: targetType || action ? { targetType: targetType || undefined, action: action as "LOGIN" | undefined } : {},
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityLog.count({ where: {} }),
    ]);

    return successResponse({
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
