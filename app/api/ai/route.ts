
// app/api/ai/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";

// ── Live inventory snapshot injected into every request ───────────────────────
async function buildInventoryContext(userRole: string, userId: string): Promise<string> {
  const isPrivileged = ["ADMIN", "MANAGER"].includes(userRole);

  const [
    products,
    pendingOrders,
    recentStock,
    recentLogs,
    userOrders,
    orderStats,
  ] = await Promise.all([
    prisma.product.findMany({
      where:   { isActive: true },
      select:  { name: true, sku: true, category: true, price: true, quantity: true, lowStockThreshold: true, supplier: true },
      orderBy: { quantity: "asc" },
    }),

    prisma.order.findMany({
      where:   { status: "PENDING", ...(!isPrivileged && { userId }) },
      include: {
        product: { select: { name: true, sku: true } },
        user:    { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    isPrivileged
      ? prisma.stockHistory.findMany({
          include: { product: { select: { name: true, sku: true } } },
          orderBy: { createdAt: "desc" },
          take: 15,
        })
      : Promise.resolve([]),

    isPrivileged
      ? prisma.activityLog.findMany({
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),

    prisma.order.findMany({
      where:   { userId },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    prisma.order.groupBy({
      by:     ["status"],
      _count: { _all: true },
    }),
  ]);

  const outOfStock   = products.filter(p => p.quantity === 0);
  const lowStock     = products.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
  const inStock      = products.filter(p => p.quantity > p.lowStockThreshold);
  const totalValue   = products.reduce((s, p) => s + p.price * p.quantity, 0);
  const orderMap     = Object.fromEntries(orderStats.map(s => [s.status, s._count._all]));
  const catBreakdown = products.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>);

  return `
=== INVENTORYIQ LIVE INVENTORY SNAPSHOT ===
Generated : ${new Date().toISOString()}
User Role : ${userRole}

--- OVERVIEW ---
Total Active Products : ${products.length}
Total Inventory Value : $${totalValue.toFixed(2)}
In Stock              : ${inStock.length} products
Low Stock Alerts      : ${lowStock.length} products
Out of Stock          : ${outOfStock.length} products

--- ORDER PIPELINE ---
Pending   : ${orderMap["PENDING"]   || 0}
Approved  : ${orderMap["APPROVED"]  || 0}
Fulfilled : ${orderMap["FULFILLED"] || 0}
Rejected  : ${orderMap["REJECTED"]  || 0}

--- CATEGORY BREAKDOWN ---
${Object.entries(catBreakdown).map(([cat, n]) => `${cat}: ${n} products`).join("\n")}

--- ALL PRODUCTS (sorted by stock level, lowest first) ---
${products.map(p => {
  const st = p.quantity === 0 ? "OUT_OF_STOCK" : p.quantity <= p.lowStockThreshold ? "LOW_STOCK" : "IN_STOCK";
  return `[${st}] ${p.name} | SKU: ${p.sku} | Category: ${p.category} | Qty: ${p.quantity} | Threshold: ${p.lowStockThreshold} | Price: $${p.price.toFixed(2)} | Supplier: ${p.supplier || "N/A"}`;
}).join("\n")}

--- OUT OF STOCK (${outOfStock.length}) ---
${outOfStock.length === 0 ? "None — all products have stock." : outOfStock.map(p => `• ${p.name} (${p.sku}) | Supplier: ${p.supplier || "N/A"}`).join("\n")}

--- LOW STOCK ALERTS (${lowStock.length}) ---
${lowStock.length === 0 ? "None — no low stock alerts." : lowStock.map(p => `• ${p.name} (${p.sku}) | ${p.quantity} remaining (threshold: ${p.lowStockThreshold}) | Supplier: ${p.supplier || "N/A"}`).join("\n")}

--- PENDING ORDERS (${pendingOrders.length}) ---
${pendingOrders.length === 0 ? "No pending orders." : pendingOrders.map(o => {
  const prod = (o as { product?: { name: string; sku: string } }).product;
  const usr  = (o as { user?: { name: string } }).user;
  return `• ${usr?.name || "Unknown"} requested ${prod?.name || "Unknown"} ×${o.quantity} | ID: ${o.id.slice(-8).toUpperCase()}`;
}).join("\n")}

${isPrivileged && recentStock.length > 0 ? `--- RECENT STOCK MOVEMENTS (last 15) ---
${recentStock.map(h => {
  const prod = (h as { product?: { name: string; sku: string } }).product;
  return `• ${prod?.name} (${prod?.sku}) | ${h.change > 0 ? "+" : ""}${h.change} units | ${h.previousQty} → ${h.newQty} | Reason: ${h.reason || "N/A"} | ${new Date(h.createdAt).toLocaleDateString()}`;
}).join("\n")}` : ""}

--- MY RECENT ORDERS ---
${userOrders.length === 0 ? "No orders found." : userOrders.map(o => {
  const prod = (o as { product?: { name: string } }).product;
  return `• ${prod?.name || "Unknown"} ×${o.quantity} | Status: ${o.status} | ${new Date(o.createdAt).toLocaleDateString()}`;
}).join("\n")}
`.trim();
}

// ── System prompt — exactly matches your brief ────────────────────────────────
function buildSystemPrompt(context: string, userRole: string, userName: string): string {
  return `You are InventoryIQ AI, an intelligent inventory management assistant integrated into the InventoryIQ platform.
Your purpose is strictly limited to helping users with inventory and warehouse operations.
You have access to products, stock quantities, orders, requests, approvals, stock history, and audit logs stored in the InventoryIQ database.

You are currently speaking with: ${userName} (Role: ${userRole})

You can help with:
- Product information
- Current stock levels
- Low stock analysis
- Out-of-stock products
- Pending, approved, rejected, and fulfilled orders
- Stock movement history
- Inventory summaries
- Top requested products
- Reorder recommendations
- Inventory analytics and trends

Rules:
1. Only answer questions related to InventoryIQ and inventory management.
2. Never answer general knowledge questions, coding questions, mathematics, history, politics, sports, entertainment, or personal advice.
3. If a question is unrelated, politely respond:
"I'm InventoryIQ AI and I'm designed exclusively to assist with inventory management and operations. Please ask a question related to products, stock, orders, or inventory analytics."
4. Never make up inventory data.
5. Use the live database snapshot below to retrieve information before answering.
6. If data is unavailable, say so instead of guessing.
7. Keep responses concise, professional, and business-focused.
8. Explain insights clearly and provide actionable recommendations when appropriate.
9. When recommending reorders, always mention the supplier name from the data.
10. Format numbers clearly (use $, units, %, etc.).

Role-specific access:
${userRole === "ADMIN"   ? "- Full access: you can discuss all products, all orders, stock history, user activity logs, and analytics." : ""}
${userRole === "MANAGER" ? "- Management access: you can discuss all products, all orders, and stock movements." : ""}
${userRole === "USER"    ? "- Standard access: only discuss products from the catalog and this user's own orders. Do not suggest admin-only actions." : ""}

=== LIVE INVENTORYIQ DATABASE SNAPSHOT ===
${context}
=== END OF DATABASE SNAPSHOT ===

Always base every answer on the snapshot above. If something is not in the data, say so clearly.`;
}

// ── Streaming API route ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const userId   = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role") || "USER";
    const userEmail = request.headers.get("x-user-email") || "User";

    if (!userId) return unauthorizedResponse();

    const { messages } = await request.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch live context + build prompt
    const context      = await buildInventoryContext(userRole, userId);
    const systemPrompt = buildSystemPrompt(context, userRole, userEmail);

    const OR_KEY = process.env.OPENROUTER_API_KEY;
    if (!OR_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not set in .env" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Proxy to OpenRouter's chat completions endpoint with streaming
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OR_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!orRes.ok || !orRes.body) {
      const errText = await orRes.text().catch(() => "");
      return serverErrorResponse(new Error(`OpenRouter error: ${orRes.status} ${errText}`));
    }

    // Stream OpenRouter response directly to the client (preserve SSE-like format)
    return new Response(orRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}