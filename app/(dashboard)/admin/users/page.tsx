"use client";
// app/(dashboard)/admin/users/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Shield, UserCheck, UserX, RefreshCw, Edit2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge, Card, Button, Modal, Spinner, EmptyState, ConfirmDialog } from "@/components/ui";
import { toast } from "@/components/ToasterRoot";
import { api } from "@/services/api.service";
import { formatDate, getInitials } from "@/lib/utils";
import type { User, Role } from "@/types";

const ROLE_BADGE: Record<Role, { variant: "red" | "yellow" | "green", label: string }> = {
  ADMIN:   { variant: "red",    label: "Admin" },
  MANAGER: { variant: "yellow", label: "Manager" },
  USER:    { variant: "green",  label: "User" },
};

const ROLE_OPTIONS: { label: string; value: Role | "" }[] = [
  { label: "All Roles", value: "" },
  { label: "Admin",     value: "ADMIN" },
  { label: "Manager",   value: "MANAGER" },
  { label: "User",      value: "USER" },
];

/* ── Create / Edit form ─────────────────────────────────────────── */
function UserFormModal({
  user,
  onClose,
  onSuccess,
}: { user?: User | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:     user?.name     ?? "",
    email:    user?.email    ?? "",
    password: "",
    role:     (user?.role    ?? "USER") as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = "Name too short";
    if (!isEdit && (!form.email || !/\S+@\S+\.\S+/.test(form.email))) e.email = "Valid email required";
    if (!isEdit && form.password.length < 8) e.password = "Password must be ≥ 8 chars";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = isEdit
        ? { name: form.name, role: form.role }
        : { name: form.name, email: form.email, password: form.password, role: form.role };

      const res = isEdit
        ? await api.updateUser(user!.id, payload)
        : await api.createUser(payload);

      if (res.success) {
        toast.success(isEdit ? "User updated" : "User created", form.name);
        onSuccess();
        onClose();
      } else {
        toast.error("Save failed", res.error);
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Full name *</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className={`form-input ${errors.name ? "border-red-500" : ""}`} placeholder="Alex Johnson" />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>

      {!isEdit && (
        <>
          <div>
            <label className="form-label">Email address *</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className={`form-input ${errors.email ? "border-red-500" : ""}`} placeholder="user@company.com" />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="form-label">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className={`form-input ${errors.password ? "border-red-500" : ""}`} placeholder="••••••••" />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>
        </>
      )}

      <div>
        <label className="form-label">Role *</label>
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })} className="form-input">
          <option value="USER"    className="bg-gray-800">User — read + request only</option>
          <option value="MANAGER" className="bg-gray-800">Manager — inventory control</option>
          <option value="ADMIN"   className="bg-gray-800">Admin — full access</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={saving}>{isEdit ? "Save Changes" : "Create User"}</Button>
      </div>
    </form>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRole] = useState<Role | "">("");
  const [page, setPage]       = useState(1);

  const [showCreate, setShowCreate]       = useState(false);
  const [editing, setEditing]             = useState<User | null>(null);
  const [toggling, setToggling]           = useState<User | null>(null);
  const [togglingLoad, setTogglingLoad]   = useState(false);
  const PAGE_SIZE = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({ search, role: roleFilter || undefined, page });
      if (res.success) {
        const d = res.data as { data: User[]; total: number };
        setUsers(d.data);
        setTotal(d.total);
      }
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, [search, roleFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function handleToggle() {
    if (!toggling) return;
    setTogglingLoad(true);
    const res = await api.updateUser(toggling.id, { isActive: !toggling.isActive });
    if (res.success) {
      toast.success(toggling.isActive ? "User deactivated" : "User activated", toggling.name);
      setToggling(null);
      fetchUsers();
    } else {
      toast.error("Failed", res.error);
    }
    setTogglingLoad(false);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <Header title="User Management" subtitle="Control access and roles" />
      <div className="p-6 space-y-4">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {(["ADMIN","MANAGER","USER"] as Role[]).map((role) => {
            const count = users.filter(u => u.role === role).length;
            const rb = ROLE_BADGE[role];
            return (
              <div key={role} className="stat-card flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                  ${role==="ADMIN"?"bg-red-500/10":role==="MANAGER"?"bg-amber-500/10":"bg-emerald-500/10"}`}>
                  <Shield className={`h-5 w-5 ${role==="ADMIN"?"text-red-400":role==="MANAGER"?"text-amber-400":"text-emerald-400"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{count}</p>
                  <p className="text-xs text-gray-500">{rb.label}s on this page</p>
                </div>
              </div>
            );
          })}
        </div>

        <Card>
          <div className="card-header">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name or email…"
                  className="form-input pl-9"
                />
              </div>
              <div className="flex gap-1.5">
                {ROLE_OPTIONS.map(r => (
                  <button key={String(r.value)}
                    onClick={() => { setRole(r.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${roleFilter === r.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={fetchUsers}><RefreshCw className="h-3.5 w-3.5" /></Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5" /> Add User
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Spinner /></div>
            ) : users.length === 0 ? (
              <EmptyState title="No users found" description="Try adjusting your filters." />
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const rb = ROLE_BADGE[u.role];
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30
                              flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-indigo-400">{getInitials(u.name)}</span>
                            </div>
                            <span className="font-medium text-gray-200">{u.name}</span>
                          </div>
                        </td>
                        <td className="text-gray-400">{u.email}</td>
                        <td><Badge variant={rb.variant}>{rb.label}</Badge></td>
                        <td>
                          <Badge variant={u.isActive ? "green" : "red"}>
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className={u.isActive ? "hover:text-red-400 hover:bg-red-500/10" : "hover:text-emerald-400 hover:bg-emerald-500/10"}
                              onClick={() => setToggling(u)}>
                              {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">{total} total users</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p-1)} disabled={page===1}>Prev</Button>
                <span className="text-xs text-gray-400 self-center">{page}/{totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New User" size="md">
        <UserFormModal onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit User" size="md">
        {editing && <UserFormModal user={editing} onClose={() => setEditing(null)} onSuccess={fetchUsers} />}
      </Modal>

      {/* Toggle active Confirm */}
      <ConfirmDialog
        isOpen={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={handleToggle}
        isLoading={togglingLoad}
        title={toggling?.isActive ? "Deactivate User" : "Activate User"}
        description={
          toggling?.isActive
            ? `Deactivating "${toggling?.name}" will prevent them from logging in.`
            : `Reactivating "${toggling?.name}" will restore their access.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        variant={toggling?.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
