// components/layout/Header.tsx
"use client";

import { Bell, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h2 className="text-base font-semibold text-gray-100">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-52 bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button className="relative p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>

        <div className="h-6 w-px bg-gray-800" />

        <div className="text-right">
          <p className="text-xs font-medium text-gray-300">{user?.name}</p>
          <p className="text-[10px] text-gray-500">{user?.email}</p>
        </div>
      </div>
    </header>
  );
}
