// app/api/dashboard/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse, unauthorizedResponse, serverErrorResponse
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    if (!userId) return unauthorizedResponse();

    const isAdminOrManager = ["ADMIN", "MANAGER"].includes(userRole || "");

    // Run all queries in parallel
    const [
      products,
      pendingOrders,
      totalUsers,
      recentActivity,
      categoryBreakdown,
      monthlyOrders,
    ] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { price: true, quantity: true, lowStockThreshold: true, category: true, createdAt: true },
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
      isAdminOrManager ? prisma.user.count() : Promise.resolve(0),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.product.groupBy({
        by: ["category"],
        where: { isActive: true },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      // Monthly order counts for the last 6 months
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true, status: true },
      }),
    ]);

    const totalProducts = products.length;
    const totalStockValue = products.reduce(
      (sum, p) => sum + p.price * p.quantity, 0
    );
    const lowStockProducts = products.filter(
      (p) => p.quantity <= p.lowStockThreshold
    );
    const outOfStockProducts = products.filter((p) => p.quantity === 0);

    // Build monthly order chart data
    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlyMap[key] = 0;
    }
    monthlyOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (key in monthlyMap) monthlyMap[key]++;
    });

    const orderTrend = Object.entries(monthlyMap).map(([name, value]) => ({
      name, value,
    }));

    const categoryData = categoryBreakdown.map((c) => ({
      name: c.category,
      count: c._count._all,
      stock: c._sum.quantity || 0,
    }));

    // return successResponse({
    //   stats: {
    //     totalProducts,
    //     totalStockValue,
    //     lowStockCount: lowStockProducts.length,
    //     outOfStockCount: outOfStockProducts.length,
    //     pendingOrders,
    //     totalUsers,
    //   },
    //   charts: {
    //     categoryData,
    //     orderTrend,
    //   },
    //   recentActivity,
    //   lowStockProducts: lowStockProducts.slice(0, 5),
    // });




    const response: any = {
  stats: {
    totalProducts,
    pendingOrders,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
  },
  charts: {
    categoryData,
    orderTrend,
  },
  lowStockProducts: lowStockProducts.slice(0, 5),
};
if (isAdminOrManager) {
  response.stats.totalStockValue = totalStockValue;
  response.stats.totalUsers = totalUsers;
  response.recentActivity = recentActivity;
}
return successResponse(response);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
