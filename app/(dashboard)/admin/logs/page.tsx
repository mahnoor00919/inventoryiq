"use client";
// app/(dashboard)/admin/logs/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, Activity } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge, Card, CardHeader, Button, Spinner, EmptyState } from "@/components/ui";
import { toast } from "@/components/ToasterRoot";
import { api } from "@/services/api.service";
import { getActionLabel, timeAgo, formatDateTime, getInitials, parseLogMeta } from "@/lib/utils";
import type { ActivityLog } from "@/types";

const ACTION_GROUPS = [
  { label: "All",      value: "" },
  { label: "Products", value: "PRODUCT" },
  { label: "Stock",    value: "STOCK" },
  { label: "Orders",   value: "ORDER" },
  { label: "Users",    value: "USER" },
  { label: "Auth",     value: "LOGIN" },
];

const ACTION_COLOR: Record<string, "green" | "blue" | "yellow" | "red" | "gray" | "purple"> = {
  PRODUCT_CREATED: "green",
  PRODUCT_UPDATED: "blue",
  PRODUCT_DELETED: "red",
  STOCK_INCREASED: "green",
  STOCK_DECREASED: "yellow",
  ORDER_CREATED:   "blue",
  ORDER_APPROVED:  "green",
  ORDER_REJECTED:  "red",
  ORDER_FULFILLED: "purple",
  USER_CREATED:    "green",
  USER_UPDATED:    "blue",
  USER_ACTIVATED:  "green",
  USER_DEACTIVATED:"red",
  LOGIN:           "gray",
  LOGOUT:          "gray",
};

function MetaBadges({ meta }: { meta: string | undefined }) {
  const parsed = parseLogMeta(meta);
  const entries = Object.entries(parsed).slice(0, 3);
  if (!entries.length) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mt-1">
      {entries.map(([k, v]) => (
        <span key={k} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
          {k}: {String(v)}
        </span>
      ))}
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs]       = useState<ActivityLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [group, setGroup]     = useState("");
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Map group to targetType for API
      const targetType =
        group === "PRODUCT" ? "product" :
        group === "STOCK"   ? "product" :   // stock logs target products
        group === "ORDER"   ? "order"   :
        group === "USER"    ? "user"    : undefined;

      const res = await api.getLogs({ targetType, page });
      if (res.success) {
        let d = res.data as { data: ActivityLog[]; total: number };
        // Client-side filter by action prefix when needed
        if (group && group !== "") {
          d = {
            ...d,
            data: d.data.filter(l => l.action.startsWith(group === "AUTH" ? "LOGIN" : group)),
          };
        }
        setLogs(d.data);
        setTotal(d.total);
      }
    } catch { toast.error("Failed to load logs"); }
    finally { setLoading(false); }
  }, [group, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <Header title="Activity Logs" subtitle="Full audit trail of all system events" />
      <div className="p-6 space-y-4">

        <Card>
          <div className="card-header">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="h-4 w-4 text-gray-500" />
              {ACTION_GROUPS.map(g => (
                <button
                  key={g.value}
                  onClick={() => { setGroup(g.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${group === g.value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"}`}>
                  {g.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Spinner /></div>
            ) : logs.length === 0 ? (
              <EmptyState title="No logs found" description="No activity matches the selected filter." />
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th>Action</th>
                    <th>Performed by</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const u = log.user as { name: string; email: string; role: string } | undefined;
                    const color = ACTION_COLOR[log.action] ?? "gray";
                    return (
                      <tr key={log.id}>
                        <td>
                          <Badge variant={color}>{getActionLabel(log.action)}</Badge>
                        </td>
                        <td>
                          {u ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/20
                                flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-indigo-400">{getInitials(u.name)}</span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-200">{u.name}</p>
                                <p className="text-[10px] text-gray-500">{u.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">System</span>
                          )}
                        </td>
                        <td>
                          {log.targetType && (
                            <Badge variant="gray">{log.targetType}</Badge>
                          )}
                        </td>
                        <td>
                          <MetaBadges meta={log.meta ?? undefined} />
                        </td>
                        <td className="text-gray-500 text-xs whitespace-nowrap">
                          <p>{timeAgo(log.createdAt)}</p>
                          <p className="text-[10px] text-gray-600">{formatDateTime(log.createdAt)}</p>
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
              <p className="text-xs text-gray-500">Showing {logs.length} of {total} events</p>
              <div className="flex gap-2 items-center">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p-1)} disabled={page===1}>Prev</Button>
                <span className="text-xs text-gray-400">{page}/{totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
