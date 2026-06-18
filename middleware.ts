// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production-min-32-chars"
);

const COOKIE_NAME = "inventory_session";

// Route access configuration
const routePermissions: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/manager": ["ADMIN", "MANAGER"],
  "/user": ["ADMIN", "MANAGER", "USER"],
  "/dashboard": ["ADMIN", "MANAGER", "USER"],
};

// Public routes that don't need auth
const publicRoutes = ["/login", "/signup", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and API auth endpoints
  if (
    publicRoutes.some((r) => pathname === r) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get JWT from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Check API route permissions
    if (pathname.startsWith("/api/")) {
      const headers = new Headers(request.headers);
      headers.set("x-user-id", payload.sub as string);
      headers.set("x-user-role", role);
      headers.set("x-user-email", payload.email as string);
      return NextResponse.next({ request: { headers } });
    }

    // Check page route permissions
    for (const [route, allowedRoles] of Object.entries(routePermissions)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(role)) {
          // Redirect to appropriate dashboard based on role
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        break;
      }
    }

    return NextResponse.next();
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
