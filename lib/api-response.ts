// lib/api-response.ts
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function successResponse<T>(data: T, message?: string, status = 200) {
  const body: ApiResponse<T> = { success: true, data, message };
  return NextResponse.json(body, { status });
}

export function errorResponse(error: string, status = 400) {
  const body: ApiResponse = { success: false, error };
  return NextResponse.json(body, { status });
}

export function unauthorizedResponse() {
  return errorResponse("Unauthorized. Please sign in.", 401);
}

export function forbiddenResponse() {
  return errorResponse("Access denied. Insufficient permissions.", 403);
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(`${resource} not found.`, 404);
}

export function serverErrorResponse(error?: unknown) {
  console.error("Server error:", error);
  return errorResponse("An internal server error occurred. Please try again.", 500);
}
