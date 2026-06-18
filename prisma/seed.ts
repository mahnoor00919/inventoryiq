// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash passwords
  const adminPass = await bcrypt.hash("Admin@123", 12);
  const managerPass = await bcrypt.hash("Manager@123", 12);
  const userPass = await bcrypt.hash("User@123", 12);

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: "admin@inventoryiq.com" },
    update: {},
    create: {
      name: "Mahnoor Admin",
      email: "admin@inventoryiq.com",
      password: adminPass,
      role:"ADMIN",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@inventoryiq.com" },
    update: {},
    create: {
      name: " Ali",
      email: "manager@inventoryiq.com",
      password: managerPass,
      // role: Role.MANAGER,
       role:"MANAGER",
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: "user@inventoryiq.com" },
    update: {},
    create: {
      name: "Zainab",
      email: "user@inventoryiq.com",
      password: userPass,
      role:"USER",
    },
  });

  // Create products
  const products = [
    { name: "MacBook Pro 16\"", sku: "MBP-16-001", price: 2499.99, quantity: 45, category: "Electronics", supplier: "Apple Inc.", supplierEmail: "supply@apple.com", lowStockThreshold: 10 },
    { name: "Dell XPS 15", sku: "DXPS-15-001", price: 1899.99, quantity: 8, category: "Electronics", supplier: "Dell Technologies", supplierEmail: "supply@dell.com", lowStockThreshold: 10 },
    { name: "Samsung 4K Monitor 27\"", sku: "SAM-MON-27", price: 549.99, quantity: 62, category: "Electronics", supplier: "Samsung", supplierEmail: "b2b@samsung.com", lowStockThreshold: 15 },
    { name: "Logitech MX Master 3", sku: "LOG-MXM3-001", price: 99.99, quantity: 5, category: "Peripherals", supplier: "Logitech", supplierEmail: "sales@logitech.com", lowStockThreshold: 20 },
    { name: "Mechanical Keyboard K95", sku: "COR-K95-001", price: 199.99, quantity: 34, category: "Peripherals", supplier: "Corsair", supplierEmail: "orders@corsair.com", lowStockThreshold: 10 },
    { name: "USB-C Hub 7-in-1", sku: "HUB-7IN1-001", price: 49.99, quantity: 3, category: "Accessories", supplier: "Anker", supplierEmail: "bulk@anker.com", lowStockThreshold: 25 },
    { name: "Webcam 4K Pro", sku: "LOG-CAM4K-001", price: 199.99, quantity: 18, category: "Peripherals", supplier: "Logitech", supplierEmail: "sales@logitech.com", lowStockThreshold: 10 },
    { name: "Standing Desk Electric", sku: "DESK-ELEC-001", price: 799.99, quantity: 12, category: "Furniture", supplier: "FlexiSpot", supplierEmail: "orders@flexispot.com", lowStockThreshold: 5 },
    { name: "Ergonomic Chair Pro", sku: "CHAIR-ERG-001", price: 599.99, quantity: 7, category: "Furniture", supplier: "Herman Miller", supplierEmail: "b2b@hermanmiller.com", lowStockThreshold: 5 },
    { name: "Noise Cancelling Headset", sku: "SONY-WH1000-001", price: 349.99, quantity: 29, category: "Audio", supplier: "Sony", supplierEmail: "b2b@sony.com", lowStockThreshold: 10 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    createdProducts.push(product);

    // Create initial stock history
    await prisma.stockHistory.create({
      data: {
        productId: product.id,
        change: p.quantity,
        reason: "Initial stock",
        previousQty: 0,
        newQty: p.quantity,
        updatedBy: admin.id,
      },
    });
  }

  // Create orders
  const orderStatuses = [OrderStatus.PENDING, OrderStatus.APPROVED, OrderStatus.REJECTED, OrderStatus.FULFILLED];
  for (let i = 0; i < 8; i++) {
    const product = createdProducts[i % createdProducts.length];
    const status = orderStatuses[i % orderStatuses.length];
    await prisma.order.create({
      data: {
        userId: user1.id,
        productId: product.id,
        quantity: Math.floor(Math.random() * 5) + 1,
        status,
        notes: `Request #${i + 1} for ${product.name}`,
        reviewedBy: status !== OrderStatus.PENDING ? admin.id : null,
        reviewedAt: status !== OrderStatus.PENDING ? new Date() : null,
      },
    });
  }

  // Create activity logs
  const logActions = [
    { action: LogAction.PRODUCT_CREATED, userId: admin.id, targetType: "product", meta: JSON.stringify({ name: "MacBook Pro" }) },
    { action: LogAction.STOCK_INCREASED, userId: manager.id, targetType: "product", meta: JSON.stringify({ amount: 20 }) },
    { action: LogAction.ORDER_APPROVED, userId: admin.id, targetType: "order", meta: JSON.stringify({ orderId: "ord_1" }) },
    { action: LogAction.USER_CREATED, userId: admin.id, targetType: "user", meta: JSON.stringify({ email: "newuser@test.com" }) },
    { action: LogAction.PRODUCT_UPDATED, userId: manager.id, targetType: "product", meta: JSON.stringify({ field: "price" }) },
    { action: LogAction.STOCK_DECREASED, userId: manager.id, targetType: "product", meta: JSON.stringify({ amount: 5 }) },
    { action: LogAction.ORDER_REJECTED, userId: admin.id, targetType: "order", meta: JSON.stringify({ reason: "Out of budget" }) },
    { action: LogAction.LOGIN, userId: user1.id, targetType: "user" },
  ];

  for (const log of logActions) {
    await prisma.activityLog.create({ data: log });
  }

  console.log("✅ Seed complete!");
  console.log("\n📋 Demo Credentials:");
  console.log("  Admin:   admin@inventoryiq.com  /  Admin@123");
  console.log("  Manager: manager@inventoryiq.com  /  Manager@123");
  console.log("  User:    user@inventoryiq.com  /  User@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
