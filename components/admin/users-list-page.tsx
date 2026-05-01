"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Search, UserMinus, UserPlus, ShieldAlert, ShieldCheck, ShoppingBag, Info, Users } from "lucide-react";
import type { AdminUser } from "@/components/admin/types";
import { formatShortDate, roleStatusClass } from "@/components/admin/types";
import { UserDetailDrawer } from "./user-detail-drawer";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { SkeletonTable } from "./ui/skeleton-table";
import { EmptyState } from "./ui/empty-state";
import { Pagination } from "./ui/pagination";
import { PAGE_SIZE } from "./constants";

export function UsersListPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [total, setTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(Math.max(1, Number(searchParams.get("page") ?? 1)));
  }, [searchParams]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/users", {
        params: { search, page, limit: PAGE_SIZE },
      });
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function handleToggleBan(user: AdminUser) {
    setIsUpdating(user.id);
  // Optimistic UI could be applied here if we want, but since it's banning, maybe wait for response
    try {
      await axios.patch(`/api/admin/users/${user.id}`, { isBanned: !user.isBanned });
      toast.success(`User ${user.isBanned ? "unbanned" : "banned"} successfully.`);
      loadUsers();
    } catch {
      toast.error("Network error.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function handlePromote(user: AdminUser) {
    setIsUpdating(user.id);
    try {
      await axios.patch(`/api/admin/users/${user.id}`, { role: "ADMIN" });
      toast.success("User promoted to Admin.");
      loadUsers();
    } catch {
      toast.error("Network error.");
    } finally {
      setIsUpdating(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage account access, roles, and review customer activity.</p>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email..."
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </section>

      {loading ? (
        <SkeletonTable columns={5} rows={10} />
      ) : users.length === 0 ? (
        <EmptyState 
          title="No users found"
          description={search ? "No users matched your search criteria." : "No users have registered yet."}
          icon={<Users className="size-10" />}
        />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-center">Orders</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 group transition duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 font-semibold text-white uppercase text-xs">
                          {user.name[0]}
                        </div>
                        <div className="grid">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${roleStatusClass[user.role]}`}>
                          {user.role}
                        </span>
                        {user.isSuperAdmin && (
                          <span className="inline-flex w-fit items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                            <ShieldCheck className="size-3" />
                            Super
                          </span>
                        )}
                        {user.isBanned && (
                          <span className="inline-flex w-fit items-center gap-1 text-[10px] font-bold text-red-600 uppercase">
                            <ShieldAlert className="size-3" />
                            Banned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-700">
                      {user._count.orders}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatShortDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUserId(user.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          title="Quick View"
                        >
                          <Info className="size-3.5" />
                          Details
                        </button>
                        <a
                          href={`/admin/orders?userId=${user.id}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="View Orders"
                        >
                          <ShoppingBag className="size-4" />
                        </a>
                        {session?.user.isSuperAdmin && user.role !== "ADMIN" && (
                          <button
                            disabled={isUpdating === user.id}
                            onClick={() => handlePromote(user)}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 transition"
                            title="Promote to Admin"
                          >
                            <UserPlus className="size-4" />
                          </button>
                        )}
                        <button
                          disabled={isUpdating === user.id || (user.isSuperAdmin && user.id !== session?.user.id)}
                          onClick={() => handleToggleBan(user)}
                          className={[
                            "inline-flex size-9 items-center justify-center rounded-lg border transition",
                            user.isBanned 
                              ? "border-green-100 text-green-600 hover:bg-green-100" 
                              : "border-red-100 text-red-600 hover:bg-red-100"
                          ].join(" ")}
                          title={user.isBanned ? "Unban User" : "Ban User"}
                        >
                          {user.isBanned ? <UserPlus className="size-4" /> : <UserMinus className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 text-xs font-semibold uppercase tracking-wider">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </section>
      )}
      <UserDetailDrawer 
        userId={selectedUserId} 
        onClose={() => setSelectedUserId(null)} 
      />
    </div>
  );
}
