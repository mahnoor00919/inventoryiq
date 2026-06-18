"use client";
// app/(auth)/login/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/components/ToasterRoot";
import type { User } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data as User);
        toast.success("Welcome back!", data.data.name);
        router.push("/dashboard");
      } else {
        toast.error("Login failed", data.error);
      }
    } catch {
      toast.error("Network error", "Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "admin" | "manager" | "user") {
    const creds = {
      admin:   { email: "admin@inventoryiq.com",   password: "Admin@123"   },
      manager: { email: "manager@inventoryiq.com", password: "Manager@123" },
      user:    { email: "user@inventoryiq.com",    password: "User@123"    },
    };
    setForm(creds[role]);
    setErrors({});
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-100 mb-1">Sign in</h2>
      <p className="text-sm text-gray-500 mb-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Create one
        </Link>
      </p>

      {/* Demo credentials */}
      <div className="mb-6 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
        <p className="text-xs font-semibold text-indigo-400 mb-2">🎯 Demo Accounts</p>
        <div className="flex gap-2 flex-wrap">
          {(["admin", "manager", "user"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => fillDemo(r)}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 capitalize border border-gray-700 transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="form-label">Email address</label>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`form-input ${errors.email ? "border-red-500" : ""}`}
            placeholder="you@company.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`form-input pr-10 ${errors.password ? "border-red-500" : ""}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 h-11"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
