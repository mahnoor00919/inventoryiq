// app/api/auth/logout/route.ts
import { clearSessionCookie, getSession } from "@/lib/auth";
import { createLog } from "@/lib/logger";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  const session = await getSession();

  if (session) {
    await createLog({
      action: "LOGOUT",
      userId: session.sub,
      targetType: "user",
    });
  }

  clearSessionCookie();
  return successResponse(null, "Logged out successfully");
}
