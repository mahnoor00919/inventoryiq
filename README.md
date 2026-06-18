# InventoryIQ — Smart Inventory Management System

A production-grade, role-based inventory management system built with Next.js 14 App Router, TypeScript, Prisma ORM, and Tailwind CSS.

---

## 🗂️ Schema (prisma/schema.prisma) — Full Explanation

The schema uses **SQLite** for local development (zero-config) and can be switched to **PostgreSQL** for production by changing one line in `.env`.

### Enums

| Enum | Values | Purpose |
|------|--------|---------|
| `Role` | `ADMIN`, `MANAGER`, `USER` | Controls what each user can see/do |
| `OrderStatus` | `PENDING`, `APPROVED`, `REJECTED`, `FULFILLED` | Tracks request lifecycle |
| `LogAction` | 14 values | Every auditable system event |

### Models

#### `User`
```prisma
id        String   – cuid primary key
name      String   – display name
email     String   – unique login identifier
password  String   – bcrypt hash (cost factor 12)
role      Role     – ADMIN / MANAGER / USER
isActive  Boolean  – soft deactivation (doesn't delete)
createdAt DateTime
updatedAt DateTime
```
Relations: has many `Order`, has many `ActivityLog`

#### `Product`
```prisma
id                String  – cuid primary key
name              String  – display name
sku               String  – unique stock-keeping unit (e.g. MBP-16-001)
description       String? – optional markdown description
price             Float   – unit price in USD
quantity          Int     – current stock count
lowStockThreshold Int     – alert fires when quantity ≤ this value
category          String  – used for filtering and pie charts
supplier          String? – supplier company name
supplierEmail     String? – for reorder contact
supplierPhone     String?
imageUrl          String? – optional product image
isActive          Boolean – soft delete (keeps history intact)
```
Relations: has many `Order`, has many `StockHistory`

#### `StockHistory`
```prisma
id          String  – cuid
productId   String  – FK → Product
change      Int     – positive = stock added, negative = stock removed
reason      String? – human-readable explanation
previousQty Int     – quantity before change
newQty      Int     – quantity after change
updatedBy   String? – userId of who made the change
createdAt   DateTime
```
Provides a full immutable audit trail of every inventory movement.

#### `Order`
```prisma
id         String      – cuid
userId     String      – FK → User (who requested)
productId  String      – FK → Product
quantity   Int         – units requested
status     OrderStatus – PENDING → APPROVED/REJECTED → FULFILLED
notes      String?     – requester's notes
reviewedBy String?     – userId of admin/manager who acted
reviewedAt DateTime?   – when the review happened
```
When an order moves to APPROVED or FULFILLED, stock is automatically deducted in a Prisma transaction.

#### `ActivityLog`
```prisma
id         String    – cuid
action     LogAction – one of 14 typed actions
userId     String?   – who did it (null = system)
targetId   String?   – ID of the affected resource
targetType String?   – "product" | "order" | "user"
meta       String?   – JSON blob for extra context (product name, quantity, etc.)
createdAt  DateTime
```

---

## 🏗️ Architecture

```
inventory-system/
├── app/
│   ├── (auth)/              # Public auth pages
│   │   ├── layout.tsx       # Centered card layout
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/         # Protected pages (sidebar layout)
│   │   ├── layout.tsx
│   │   ├── dashboard/       # Main overview (all roles)
│   │   ├── admin/
│   │   │   ├── users/       # User management (ADMIN only)
│   │   │   └── logs/        # Activity audit log (ADMIN only)
│   │   ├── manager/
│   │   │   ├── products/    # Product CRUD (ADMIN + MANAGER)
│   │   │   ├── stock/       # Stock adjustments (ADMIN + MANAGER)
│   │   │   └── orders/      # Order review/approve (ADMIN + MANAGER)
│   │   └── user/
│   │       ├── catalog/     # Browse products (USER)
│   │       └── requests/    # Own order history (USER)
│   ├── api/
│   │   ├── auth/            # login, logout, signup, session
│   │   ├── products/        # CRUD + search
│   │   ├── stock/           # Adjust stock levels
│   │   ├── orders/          # Create + review orders
│   │   ├── users/           # Admin user management
│   │   ├── dashboard/       # Aggregate stats + chart data
│   │   └── logs/            # Activity log queries
│   ├── layout.tsx           # Root (imports AuthBootstrap + ToasterRoot)
│   └── globals.css          # Tailwind + design tokens
│
├── components/
│   ├── AuthBootstrap.tsx    # Client: hydrates Zustand from session cookie
│   ├── ToasterRoot.tsx      # Client: inline toast system (no dep on ui/)
│   ├── layout/
│   │   ├── Sidebar.tsx      # Navigation + role-aware links + logout
│   │   └── Header.tsx       # Top bar with search + user info
│   └── ui/
│       └── index.tsx        # Button, Badge, Input, Select, Modal, ConfirmDialog, Card…
│
├── features/
│   └── inventory/
│       └── ProductForm.tsx  # Add/edit product form (react-hook-form)
│
├── lib/
│   ├── db.ts                # Prisma singleton
│   ├── auth.ts              # JWT sign/verify + cookie helpers
│   ├── logger.ts            # createLog() — fire-and-forget activity logging
│   ├── api-response.ts      # Standardized JSON response helpers
│   └── utils.ts             # cn(), formatCurrency(), timeAgo(), etc.
│
├── services/
│   └── api.service.ts       # Client-side fetch wrapper for all endpoints
│
├── store/
│   └── auth.store.ts        # Zustand auth store (user + loading state)
│
├── types/
│   └── index.ts             # All TypeScript interfaces + enums
│
├── middleware.ts             # Edge JWT auth guard + role routing
├── prisma/
│   ├── schema.prisma        # Full database schema (see above)
│   └── seed.ts              # Demo data (3 users, 10 products, 8 orders)
│
├── .env                     # Local env vars (SQLite by default)
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev with SQLite)
```

### 3. Create database + push schema
```bash
npm run db:generate   # generates Prisma Client
npm run db:push       # creates the SQLite database from schema
```

### 4. Seed demo data
```bash
npm run db:seed
```

### 5. Start the dev server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 👤 Demo Credentials

| Role    | Email                       | Password     | Access |
|---------|-----------------------------|--------------|--------|
| Admin   | admin@inventoryiq.com       | Admin@123    | Everything |
| Manager | manager@inventoryiq.com     | Manager@123  | Products, Stock, Orders |
| User    | user@inventoryiq.com        | User@123     | Catalog, Requests |

---

## 🔐 RBAC Matrix

| Feature           | Admin | Manager | User |
|-------------------|:-----:|:-------:|:----:|
| Dashboard         | ✅    | ✅      | ✅   |
| Add/Edit Products | ✅    | ✅      | ❌   |
| Delete Products   | ✅    | ❌      | ❌   |
| Adjust Stock      | ✅    | ✅      | ❌   |
| View Orders       | ✅    | ✅      | Own  |
| Approve Orders    | ✅    | ✅      | ❌   |
| Browse Catalog    | ✅    | ✅      | ✅   |
| Request Products  | ✅    | ✅      | ✅   |
| Manage Users      | ✅    | ❌      | ❌   |
| Activity Logs     | ✅    | ❌      | ❌   |

---

## 🏭 Moving to Production

### Switch to PostgreSQL
```env
# .env
DATABASE_URL="postgresql://user:password@host:5432/inventory_db"
```
Then run `npm run db:push` again.

### Environment variables needed
```env
DATABASE_URL=...       # your production DB
JWT_SECRET=...         # 64-char random string: openssl rand -hex 32
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Deploy options
- **Vercel** — push to GitHub, connect Vercel, add env vars
- **Railway / Render** — supports PostgreSQL + Next.js natively
- **Docker** — add a `Dockerfile` with multi-stage build

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| ORM | Prisma 5 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | Custom JWT (jose) + httpOnly cookies |
| State | Zustand |
| Forms | react-hook-form |
| Charts | Recharts |
| Icons | lucide-react |
| Validation | Zod |
