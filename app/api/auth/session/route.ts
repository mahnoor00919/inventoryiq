// app/api/auth/session/route.ts
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorizedResponse();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) return unauthorizedResponse();

    return successResponse(user);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
