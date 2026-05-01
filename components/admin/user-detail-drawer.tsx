"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { X, Mail, Calendar, Hash, IndianRupee, Clock } from "lucide-react";
import { 
  formatCurrency, 
  formatShortDate, 
  orderStatusClass, 
  roleStatusClass, 
  type UserSummary 
} from "@/components/admin/types";

interface UserDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailDrawer({ userId, onClose }: UserDetailDrawerProps) {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
       (null);
      setError(null);
      return;
    }

    const selectedUserId = userId;

    async function loadSummary() {
      setIsLoading(true);
      setSummary(null);
      setError(null);
      try {
        const { data } = await axios.get("/api/admin/users/summary", {
          params: { id: selectedUserId },
          headers: { Accept: "application/json" },
        });

        if (data.summary) {
          setSummary(data.summary);
        }
      } catch (error) {
        console.error("Failed to load user summary.");
        setError(error instanceof Error ? error.message : "Failed to load user summary.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <aside 
        className={[
          "fixed inset-y-0 right-0 z-[70] w-full max-w-[480px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300",
          userId ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">User Details</h2>
              <p className="text-sm text-slate-500">Overview of account and order history.</p>
            </div>
            <button 
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {isLoading ? (
              <div className="space-y-6">
                <div className="h-24 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-40 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-64 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            ) : error ? (
              <p className="py-20 text-center text-sm text-red-500">{error}</p>
            ) : summary ? (
              <>
                {/* Profile Card */}
                <section className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex size-14 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white uppercase">
                    {summary.name?.[0] ?? "U"}
                  </div>
                  <div className="grid gap-1">
                    <h3 className="text-lg font-bold text-slate-900">{summary.name}</h3>
                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${roleStatusClass[summary.role]}`}>
                      {summary.role}
                    </span>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <Mail className="size-3.5" />
                      {summary.email}
                    </div>
                  </div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase">
                      <Hash className="size-3" />
                      Total Orders
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{summary.totalOrders}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase">
                      <IndianRupee className="size-3" />
                      Lifetime Spend
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(summary.lifetimeSpend)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase">
                      <Calendar className="size-3" />
                      Joined Date
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatShortDate(summary.joinedDate)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase">
                      <Clock className="size-3" />
                      User ID
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={summary.id}>{summary.id}</p>
                  </div>
                </section>

                {/* Recent Orders */}
                <section>
                  <h4 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                    Last 5 Orders
                  </h4>
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
                    {summary.recentOrders.length > 0 ? (
                      summary.recentOrders.map((order) => (
                        <div key={order.id} className="group flex items-center justify-between p-4 transition hover:bg-slate-50 hover:shadow-sm">
                          <div className="grid gap-1">
                            <p className="font-mono text-sm font-medium text-slate-900">#{order.id.slice(-8).toUpperCase()}</p>
                            <p className="text-[11px] text-slate-500">{formatShortDate(order.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${orderStatusClass[order.status]}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-8 text-center text-sm text-slate-500 italic">No orders yet.</p>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <p className="py-20 text-center text-slate-500">User not found.</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 p-6 bg-slate-50/50">
            <button 
              onClick={onClose}
              className="w-full h-11 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
