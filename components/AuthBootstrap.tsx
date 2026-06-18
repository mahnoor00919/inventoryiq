"use client";
// components/AuthBootstrap.tsx
// Runs once on mount and populates the Zustand auth store from the session cookie.
// Kept separate so the Server Component layout.tsx stays import-clean.
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types";

export function AuthBootstrap() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((res) => setUser(res.success ? (res.data as User) : null))
      .catch(() => setUser(null));
  }, [setUser]);

  return null; // renders nothing — purely a side-effect component
}
