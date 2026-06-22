// lib/logger.ts
import { prisma } from "./db";
import type { LogAction } from "@/types";

interface LogParams {
  action: LogAction;
  userId?: string;
  targetId?: string;
  targetType?: string;
  meta?: Record<string, unknown>;
}

export async function createLog(params: LogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: params.action,
        userId: params.userId,
        targetId: params.targetId,
        targetType: params.targetType,
        meta: params.meta ? JSON.stringify(params.meta) : undefined,
      },
    });
  } catch (error) {
    // Don't throw — logging should never break business logic
    console.error("Failed to create activity log:", error);
  }
}