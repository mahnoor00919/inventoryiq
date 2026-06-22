// // app/api/auth/login/route.ts
// import { NextRequest } from "next/server";
// import bcrypt from "bcryptjs";
// import { prisma } from "@/lib/db";
// import { signToken, setSessionCookie } from "@/lib/auth";
// import { createLog } from "@/lib/logger";
// import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
// import { z } from "zod";

// const loginSchema = z.object({
//   email: z.string().email("Invalid email address"),
//   password: z.string().min(6, "Password must be at least 6 characters"),
// });

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const result = loginSchema.safeParse(body);

//     if (!result.success) {
//       return errorResponse(result.error.errors[0].message);
//     }

//     const { email, password } = result.data;

//     const user = await prisma.user.findUnique({ where: { email } });

//     if (!user) {
//       return errorResponse("Invalid email or password.", 401);
//     }

//     if (!user.isActive) {
//       return errorResponse("Your account has been deactivated. Contact an administrator.", 403);
//     }

//     const passwordMatch = await bcrypt.compare(password, user.password);
//     if (!passwordMatch) {
//       return errorResponse("Invalid email or password.", 401);
//     }

//     const token = await signToken({
//       sub: user.id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//     });

//     setSessionCookie(token);

//     await createLog({
//       action: "LOGIN",
//       userId: user.id,
//       targetType: "user",
//     });

//     return successResponse(
//       { id: user.id, name: user.name, email: user.email, role: user.role },
//       "Login successful"
//     );
//   } catch (error) {
//     return serverErrorResponse(error);
//   }
// }

// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { createLog } from "@/lib/logger";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { z } from "zod";
import type { Role } from "@/types";


const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message);
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return errorResponse("Invalid email or password.", 401);
    }

    if (!user.isActive) {
      return errorResponse("Your account has been deactivated. Contact an administrator.", 403);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return errorResponse("Invalid email or password.", 401);
    }

    const userRole = user.role as Role;

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: userRole,
    });

    setSessionCookie(token);

    await createLog({
      action: "LOGIN",
      userId: user.id,
      targetType: "user",
    });

    return successResponse(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      "Login successful"
    );
  } catch (error) {
    return serverErrorResponse(error);
  }
}