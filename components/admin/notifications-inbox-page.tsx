"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Bell, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

const iconMap: Record<string, any> = {
  ORDER_PLACED: ShoppingBag,
  ORDER_CONFIRMED: CheckCircle2,
  ORDER_SHIPPED: Package,
  ORDER_DELIVERED: CheckCircle2,
  ORDER_RETURNED: CheckCircle2,
  ORDER_CANCELLED: XCircle,
  NEW_ORDER: ShoppingBag,
  LOW_STOCK: AlertTriangle,
};

export function NotificationsInboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const { data } = await axios.get("/api/notifications", {
        params: { page, limit, unreadOnly: filter === "unread" },
      });
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [page, filter]);

  async function markAsRead(id: string) {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast.error("Failed to update notification");
    }
  }

  async function markAllRead() {
    try {
      await axios.patch("/api/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All marked as read");
    } catch (error) {
      toast.error("Failed to update notifications");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Stay updated with your store activity.</p>
        </div>
        <button
          onClick={markAllRead}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Check className="size-4" />
          Mark all as read
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setFilter("all"); setPage(1); }}
          className={[
            "h-9 rounded-lg px-4 text-sm font-medium transition",
            filter === "all" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-100"
          ].join(" ")}
        >
          All
        </button>
        <button
          onClick={() => { setFilter("unread"); setPage(1); }}
          className={[
            "h-9 rounded-lg px-4 text-sm font-medium transition",
            filter === "unread" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-100"
          ].join(" ")}
        >
          Unread
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 flex gap-4 animate-pulse">
                <div className="size-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-slate-100 rounded" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="px-6 py-20 text-center text-slate-500">
              No notifications found.
            </div>
          ) : (
            notifications.map((notif) => {
              const Icon = iconMap[notif.type] || Bell;
              return (
                <div
                  key={notif.id}
                  className={[
                    "group flex gap-4 p-6 transition hover:bg-slate-50/50",
                    !notif.isRead && "bg-blue-50/20"
                  ].join(" ")}
                >
                  <div className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-full transition",
                    notif.type === "LOW_STOCK" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  ].join(" ")}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid gap-1">
                        <h3 className="font-bold text-slate-950 leading-none">{notif.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-xs font-medium text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </div>
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="size-2 rounded-full bg-blue-600"
                            title="Mark as read"
                          />
                        )}
                      </div>
                    </div>
                    {notif.link && (
                      <a
                        href={notif.link}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                      >
                        View Details
                        < ChevronRight className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} notifications
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="flex size-8 items-center justify-center rounded border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex size-8 items-center justify-center rounded border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
