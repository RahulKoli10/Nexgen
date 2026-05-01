"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Check, Save } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminOrder, OrderStatus } from "@/components/admin/types";
import { formatCurrency, formatShortDate, orderStatusClass } from "@/components/admin/types";

const timelineSteps: Array<{ label: string; status: Exclude<OrderStatus, "CANCELLED" | "RETURN_REQUESTED" | "RETURNED"> }> = [
  { label: "Placed", status: "PENDING" },
  { label: "Confirmed", status: "CONFIRMED" },
  { label: "Shipped", status: "SHIPPED" },
  { label: "Delivered", status: "DELIVERED" },
];

const stepIndexByStatus: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  RETURN_REQUESTED: 3,
  RETURNED: 3,
  CANCELLED: -1,
};

function paymentMethodLabel(method?: string, provider?: string | null) {
  return method === "ONLINE" ? provider || "Online payment" : "Cash on Delivery";
}

function paymentStatusLabel(status?: string) {
  return status === "PAID" ? "Payment paid" : "Payment pending";
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [validNextStatuses, setValidNextStatuses] = useState<OrderStatus[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    let isMounted = true;

    axios.get(`/api/admin/orders/${orderId}`)
      .then(({ data }) => {
        if (!isMounted) return;
        setOrder(data.order);
        setValidNextStatuses(data.validNextStatuses ?? []);
        setSelectedStatus("");
        setNote(data.order.adminNote ?? "");
      })
      .catch((error) => {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : "Order not found.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const completedIndex = useMemo(() => (order ? stepIndexByStatus[order.status] : -1), [order]);

  async function updateStatus() {
    if (!selectedStatus) return;
    setIsUpdating(true);
    try {
      const { data } = await axios.patch(`/api/admin/orders/${orderId}/status`, { status: selectedStatus });
      setOrder(data.order);
      setValidNextStatuses(data.order ? nextStatuses(data.order.status) : []);
      setSelectedStatus("");
      toast.success("Order status updated.");
    } catch {
      toast.error("Unable to update order status.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function saveNote() {
    setIsSavingNote(true);
    try {
      await axios.patch(`/api/admin/orders/${orderId}/note`, { note });
      toast.success("Internal note saved.");
    } catch {
      toast.error("Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  }

  if (!order) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Loading order...
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/orders" className="text-sm font-medium text-blue-600 hover:underline">
          Back to orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Order {order.id}</h1>
            <p className="mt-1 text-sm text-slate-500">{formatShortDate(order.createdAt)}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${orderStatusClass[order.status]}`}>
            {order.status}
          </span>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Order ID</p>
          <p className="mt-2 font-mono text-lg text-slate-950">{order.id}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Created date</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatShortDate(order.createdAt)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total amount</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Customer Info</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <p className="font-medium text-slate-950">{order.customerName}</p>
              <p className="text-slate-600">{order.customerEmail ?? "No email"}</p>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Delivery Address</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">{order.addressText}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Payment</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <p className="font-medium text-slate-950">
                {paymentStatusLabel(order.paymentStatus)}
              </p>
              <p className="text-slate-600">
                Method: {paymentMethodLabel(order.paymentMethod, order.paymentProvider)}
              </p>
              {order.paymentId ? (
                <p className="break-all text-slate-600">Payment ID: {order.paymentId}</p>
              ) : null}
              {order.paymentProviderOrderId ? (
                <p className="break-all text-slate-600">
                  Provider order: {order.paymentProviderOrderId}
                </p>
              ) : null}
              {order.paidAt ? (
                <p className="text-slate-600">Paid at: {formatShortDate(order.paidAt)}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product name</th>
                  <th className="px-5 py-3">Variant</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3">Price at order</th>
                  <th className="px-5 py-3">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, index) => (
                  <tr key={item.id ?? `${item.variantId ?? item.productId}-${index}`}>
                    <td className="px-5 py-4 font-medium text-slate-950">{item.productName}</td>
                    <td className="px-5 py-4 text-slate-600">{item.variantName ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{item.quantity}</td>
                    <td className="px-5 py-4 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatCurrency(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-5 py-4 text-right font-semibold text-slate-950">
                    Order total
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Status Timeline</h2>
        {order.status === "CANCELLED" ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            Order cancelled
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {timelineSteps.map((step, index) => {
              const isComplete = index < completedIndex;
              const isCurrent = index === completedIndex;
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <span
                    className={[
                      "inline-flex size-9 items-center justify-center rounded-full border text-sm font-semibold",
                      isComplete ? "border-green-500 bg-green-500 text-white" : "",
                      isCurrent ? "border-blue-500 bg-blue-50 text-blue-700" : "",
                      !isComplete && !isCurrent ? "border-slate-200 bg-slate-100 text-slate-400" : "",
                    ].join(" ")}
                  >
                    {isComplete ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className={isCurrent ? "font-semibold text-blue-700" : "text-sm text-slate-600"}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Status Update</h2>
          {validNextStatuses.length ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}
                className="h-10 min-w-56 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Choose next status</option>
                {validNextStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedStatus || isUpdating}
                onClick={updateStatus}
                className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Update Status"}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No further status changes are available for this order.</p>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-950">Internal Notes</h2>
            {isSavingNote ? <span className="text-xs font-medium text-slate-500">Saving...</span> : null}
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={saveNote}
            rows={5}
            placeholder="Add admin notes"
            className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Save className="size-3" />
            Auto-saves on blur
          </p>
        </div>
      </section>
    </div>
  );
}

function nextStatuses(status: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    RETURN_REQUESTED: ["RETURNED"],
    RETURNED: [],
    CANCELLED: [],
  };

  return transitions[status];
}
