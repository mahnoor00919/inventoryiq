// app/api/users/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createLog } from "@/lib/logger";
import {
  successResponse, errorResponse, unauthorizedResponse,
  forbiddenResponse, serverErrorResponse
} from "@/lib/api-response";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "USER"]),
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) return unauthorizedResponse();
    if (userRole !== "ADMIN") return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(role && { role: role as "ADMIN" | "MANAGER" | "USER" }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true,
          role: true, isActive: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse({
      data: users,
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
    if (userRole !== "ADMIN") return forbiddenResponse();

    const body = await request.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const existing = await prisma.user.findUnique({
      where: { email: result.data.email },
    });

    if (existing) {
      return errorResponse("A user with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 12);

    const newUser = await prisma.user.create({
      data: { ...result.data, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await createLog({
      action: "USER_CREATED",
      userId,
      targetId: newUser.id,
      targetType: "user",
      meta: { email: newUser.email, role: newUser.role },
    });

    return successResponse(newUser, "User created successfully", 201);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
