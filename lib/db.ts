// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Set DATABASE_URL in Vercel before deploying."
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

let prismaClient = globalForPrisma.prisma;

const prismaProxy = new Proxy({} as PrismaClient, {
  get(_, prop, receiver) {
    if (!prismaClient) {
      prismaClient = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = prismaClient;
      }
    }

    const value = Reflect.get(prismaClient, prop, receiver);
    return typeof value === "function" ? value.bind(prismaClient) : value;
  },

  set(_, prop, value, receiver) {
    if (!prismaClient) {
      prismaClient = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = prismaClient;
      }
    }

    return Reflect.set(prismaClient, prop, value, receiver);
  },
});

export const prisma = prismaProxy;
