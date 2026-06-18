"use client";
// app/(auth)/signup/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/components/ToasterRoot";
import type { User } from "@/types";

const RULES = [
  { test: (p: string) => p.length >= 8,          label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p),         label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p),         label: "One number" },
];

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = "Name must be at least 2 characters";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (RULES.some((r) => !r.test(form.password))) e.password = "Password doesn't meet requirements";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data as User);
        toast.success("Account created!", "Welcome to InventoryIQ");
        router.push("/dashboard");
      } else {
        toast.error("Signup failed", data.error);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-100 mb-1">Create account</h2>
      <p className="text-sm text-gray-500 mb-6">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Full name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`form-input ${errors.name ? "border-red-500" : ""}`}
            placeholder="Alex Johnson"
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>

        <div>
          <label className="form-label">Email address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`form-input ${errors.email ? "border-red-500" : ""}`}
            placeholder="you@company.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>

        <div>
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`form-input pr-10 ${errors.password ? "border-red-500" : ""}`}
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Password strength hints */}
          <div className="mt-2 space-y-1">
            {RULES.map((r) => {
              const ok = r.test(form.password);
              return (
                <div key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-400" : "text-gray-600"}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  {r.label}
                </div>
              );
            })}
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
        </div>

        <div>
          <label className="form-label">Confirm password</label>
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className={`form-input ${errors.confirm ? "border-red-500" : ""}`}
            placeholder="••••••••"
          />
          {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2">
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : <UserPlus className="h-4 w-4" />}
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-xs text-gray-600 text-center">
          New accounts are created with the <span className="text-gray-400">User</span> role.<br />
          Contact an Admin to change your role.
        </p>
      </form>
    </div>
  );
}
