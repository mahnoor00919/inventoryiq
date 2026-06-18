// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { ToasterRoot } from "@/components/ToasterRoot";

export const metadata: Metadata = {
  title: "InventoryIQ — Smart Inventory Management",
  description: "Enterprise-grade inventory management system with role-based access control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            className="antialiased bg-gray-950 text-gray-100">
        <AuthBootstrap />
        {children}
        <ToasterRoot />
      </body>
    </html>
  );
}
