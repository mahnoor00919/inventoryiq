// features/auth/AuthProvider.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/services/api.service";
import type { User } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    async function initSession() {
      try {
        const res = await api.getSession();
        if (res.success && res.data) {
          setUser(res.data as User);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    initSession();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
