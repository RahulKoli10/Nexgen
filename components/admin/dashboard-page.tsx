"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OrderStatus } from "@/components/admin/types";
import { formatCurrency, formatShortDate } from "@/components/admin/types";

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  lowStockCount: number;
};

type RevenuePoint = {
  date: string;
  revenue: number;
};

type TopProduct = {
  name: string;
  unitsSold: number;
  revenue: number;
};

type RecentOrder = {
  id: string;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
};

const statusClass: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURN_REQUESTED: "bg-[#FAEEDA] text-[#633806]",
  RETURNED: "bg-[#F1EFE8] text-[#5F5E5A]",
  CANCELLED: "bg-red-100 text-red-800",
};

export function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsChartReady(true));

    async function loadDashboard() {
      const [statsResponse, revenueResponse, topProductsResponse, ordersResponse] = await Promise.all([
        axios.get("/api/admin/stats"),
        axios.get("/api/admin/stats/revenue", { params: { days: 7 } }),
        axios.get("/api/admin/stats/top-products"),
        axios.get("/api/admin/orders", { params: { limit: 10, sort: "createdAt_desc" } }),
      ]);

      setStats(statsResponse.data);
      setRevenue(revenueResponse.data);
      setTopProducts(topProductsResponse.data);
      setRecentOrders(ordersResponse.data.orders ?? []);
    }

    loadDashboard();

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const chartData = useMemo(
    () =>
      revenue.map((point) => ({
        ...point,
        label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(point.date)),
      })),
    [revenue]
  );

  const metricCards = [
    { label: "Total Orders", value: stats?.totalOrders ?? "-", accent: "border-l-blue-500" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? "-", accent: "border-l-yellow-500" },
    { label: "Total Revenue", value: stats ? formatCurrency(stats.revenue) : "-", accent: "border-l-green-500" },
    { label: "Low Stock Items", value: stats?.lowStockCount ?? "-", accent: "border-l-red-500" },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Live overview of orders, revenue, and inventory signals.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className={`rounded-md border border-slate-200 border-l-4 ${card.accent} bg-white p-5 shadow-sm`}>
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Revenue</h2>
            <p className="text-sm text-slate-500">Delivered order revenue over the last 7 days.</p>
          </div>
        </div>
        <div className="h-80">
          {isChartReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 6, right: 18, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} labelClassName="text-slate-950" />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-md bg-slate-50" />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Top Selling Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-130 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product name</th>
                  <th className="px-5 py-3">Units sold</th>
                  <th className="px-5 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((product) => (
                  <tr key={product.name}>
                    <td className="px-5 py-4 font-medium text-slate-950">{product.name}</td>
                    <td className="px-5 py-4 text-slate-600">{product.unitsSold}</td>
                    <td className="px-5 py-4 text-slate-600">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <td className="px-5 py-4 font-mono text-slate-700">{order.id.slice(0, 8)}</td>
                    <td className="px-5 py-4 font-medium text-slate-950">{order.customerName}</td>
                    <td className="px-5 py-4 text-slate-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatShortDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
