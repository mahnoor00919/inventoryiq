// app/api/auth/signup/route.ts
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { createLog } from "@/lib/logger";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { z } from "zod";
import type { Role } from "@/types";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const { name, email, password } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("An account with this email already exists.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "USER" },
    });

    const userRole = user.role as Role;

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: userRole,
    });

    setSessionCookie(token);

    await createLog({
      action: "USER_CREATED",
      userId: user.id,
      targetId: user.id,
      targetType: "user",
      meta: { email: user.email, name: user.name },
    });

    return successResponse(
      { id: user.id, name: user.name, email: user.email, role: userRole },
      "Account created successfully",
      201
    );
  } catch (error) {
    return serverErrorResponse(error);
  }
}
