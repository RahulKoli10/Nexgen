"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import { SiteHeader } from "@/components/home/site-header";
import { SiteFooter } from "@/components/home/site-footer";
import { CtaButton } from "@/components/home/cta-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-context";

type OrderStatus = "ALL" | "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURN_REQUESTED" | "RETURNED" | "CANCELLED";

type OrderItem = {
  id: string;
  quantity: number;
  productName?: string;
  variantName?: string;
  priceAtOrder?: number;
  variant?: {
    product?: { name?: string };
  };
};

type OrderAddress = {
  fullName?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string | null;
  pincode?: string;
};

type Order = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentProvider?: string | null;
  paymentId?: string | null;
  paymentProviderOrderId?: string | null;
  paidAt?: string | null;
  items: OrderItem[];
  address?: OrderAddress | null;
};

const statusTabs: { label: string; value: OrderStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "CONFIRMED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Returns", value: "RETURN_REQUESTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const timelineSteps = [
  { label: "Placed", status: "PENDING", icon: ReceiptText },
  { label: "Confirmed", status: "CONFIRMED", icon: BadgeCheck },
  { label: "Shipped", status: "SHIPPED", icon: Truck },
  { label: "Delivered", status: "DELIVERED", icon: PackageCheck },
];

function formatCurrencyFromPaise(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((value || 0) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeStatus(status: string): OrderStatus {
  const normalized = status.toUpperCase();
  if (["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "RETURN_REQUESTED", "RETURNED", "CANCELLED"].includes(normalized)) {
    return normalized as OrderStatus;
  }

  return "PENDING";
}

function getStatusCopy(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "DELIVERED") return "Delivered to your address";
  if (normalized === "RETURN_REQUESTED") return "Return requested";
  if (normalized === "RETURNED") return "Returned";
  if (normalized === "SHIPPED") return "On the way";
  if (normalized === "CANCELLED") return "Order cancelled";
  if (normalized === "CONFIRMED") return "Packing in progress";
  return "Order received";
}

function getPaymentMethodLabel(order: Order) {
  return order.paymentMethod === "ONLINE"
    ? order.paymentProvider || "Online payment"
    : "Cash on Delivery";
}

function getPaymentStatusLabel(order: Order) {
  return order.paymentStatus === "PAID" ? "Payment paid" : "Payment due at delivery";
}

function getStepIndex(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "DELIVERED" || normalized === "RETURN_REQUESTED" || normalized === "RETURNED") return 3;
  if (normalized === "SHIPPED") return 2;
  if (normalized === "CONFIRMED") return 1;
  return 0;
}

function getOrderItemsText(order: Order) {
  return order.items
    ?.map((item) => item.productName || item.variant?.product?.name || "")
    .filter(Boolean)
    .join(" ");
}

function getDeliveryEstimate(order: Order) {
  const createdAt = new Date(order.createdAt);
  const start = new Date(createdAt);
  const end = new Date(createdAt);

  start.setDate(start.getDate() + 3);
  end.setDate(end.getDate() + 5);

  return `${formatDate(start.toISOString())} - ${formatDate(end.toISOString())}`;
}

function OrderTrackingModal({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}) {
  if (!open || !order) return null;

  const activeStep = getStepIndex(order.status);
  const isCancelled = normalizeStatus(order.status) === "CANCELLED";
  const currentStep = timelineSteps[Math.min(activeStep, timelineSteps.length - 1)];
  const CurrentIcon = currentStep.icon;
  const addressParts = [
    order.address?.line1,
    order.address?.line2,
    order.address?.city,
    order.address?.state,
    order.address?.pincode,
  ].filter(Boolean);

  return (
    <div className="orders-modal-backdrop">
      <div className="orders-tracking-modal">
        <button type="button" className="orders-modal-close" onClick={onClose} aria-label="Close tracking modal">
          <X className="size-5" />
        </button>

        <div className={`orders-modal-head ${isCancelled ? "is-cancelled" : ""}`}>
          <span className="orders-modal-icon">
            {isCancelled ? <XCircle className="size-5" /> : <CurrentIcon className="size-5" />}
          </span>
          <div>
            <p className="eyebrow">Live order tracking</p>
            <h2>Order #{order.id.slice(-8).toUpperCase()}</h2>
            <span>{getStatusCopy(order.status)}</span>
          </div>
        </div>

        {!isCancelled && (
          <div className="orders-modal-status-card">
            <div>
              <span>Current status</span>
              <strong>{currentStep.label}</strong>
              <small>Updated {formatDateTime(order.updatedAt || order.createdAt)}</small>
            </div>
            <div className="orders-modal-progress-meter">
              <span style={{ width: `${((activeStep + 1) / timelineSteps.length) * 100}%` }} />
            </div>
          </div>
        )}

        {isCancelled ? (
          <div className="orders-cancelled-panel">
            <XCircle className="size-8" />
            <strong>This order has been cancelled.</strong>
            <span>Refund or payment reversal updates will appear in your original payment mode.</span>
          </div>
        ) : (
          <div className="orders-track-list">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon;
              const isDone = index < activeStep;
              const isActive = index === activeStep;

              return (
                <div
                  key={step.label}
                  className={`orders-track-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
                >
                  <span>
                    {isDone ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <div>
                    <strong>{step.label}</strong>
                    <small>{isDone || isActive ? formatDateTime(order.updatedAt || order.createdAt) : "Pending update"}</small>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="orders-modal-summary">
          <span>
            <ReceiptText className="size-4" />
            Payment: {getPaymentStatusLabel(order)}
          </span>
          <span>
            <CalendarDays className="size-4" />
            Estimated delivery: {getDeliveryEstimate(order)}
          </span>
          <span>
            <MapPin className="size-4" />
            Ship to: {addressParts.length ? addressParts.join(", ") : "Saved checkout address"}
          </span>
          <span>
            <ShieldCheck className="size-4" />
            Secure order ID: {order.id.slice(0, 8)}
          </span>
        </div>

        <div className="orders-modal-items">
          <strong>Package contents</strong>
          {order.items.slice(0, 3).map((item) => (
            <span key={item.id}>
              <Package className="size-4" />
              {item.productName || item.variant?.product?.name || "Product"} x {item.quantity}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="orders-skeleton-list">
      {[1, 2, 3].map((item) => (
        <div key={item} className="orders-skeleton-card">
          <span />
          <strong />
          <p />
          <p />
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("ALL");
  const [query, setQuery] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [returningOrderId, setReturningOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders,
    queryFn: async () => {
      const res = await api.get("/order/user");
      return Array.isArray(res.data) ? (res.data as Order[]) : [];
    },
    placeholderData: [],
  });

  const orders = ordersQuery.data || [];
  const loading = ordersQuery.isLoading;

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post("/order/user", { orderId, action: "cancel" });
      return orderId;
    },
    onMutate: (orderId) => {
      setCancellingOrderId(orderId);
    },
    onSuccess: (orderId) => {
      queryClient.setQueryData<Order[]>(queryKeys.orders, (current = []) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: "CANCELLED" } : order
        )
      );
      setCancelOrder(null);
      showToast("Order cancelled successfully.", "success");
    },
    onError: () => {
      showToast("Unable to cancel this order.", "error");
    },
    onSettled: () => {
      setCancellingOrderId(null);
    },
  });

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders.filter((order) => {
      const status = normalizeStatus(order.status);
      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter ||
        (statusFilter === "CONFIRMED" && (status === "PENDING" || status === "CONFIRMED"));

      const matchesSearch =
        !search ||
        order.id.toLowerCase().includes(search) ||
        getOrderItemsText(order).toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [orders, query, statusFilter]);

  const orderStats = useMemo(() => {
    const delivered = orders.filter((order) => normalizeStatus(order.status) === "DELIVERED").length;
    const active = orders.filter((order) =>
      ["PENDING", "CONFIRMED", "SHIPPED"].includes(normalizeStatus(order.status)),
    ).length;
    const totalSpent = orders
      .filter((order) => normalizeStatus(order.status) !== "CANCELLED")
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    return { delivered, active, totalSpent };
  }, [orders]);

  const handleCancel = (order: Order) => {
    setCancelOrder(order);
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrder) return;

    const orderId = cancelOrder.id;
    setCancellingOrderId(orderId);

    cancelOrderMutation.mutate(orderId);
  };

  const requestReturn = async (order: Order) => {
    setReturningOrderId(order.id);

    try {
      await axios.post("/api/order/user", { orderId: order.id, action: "return" });
      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status: "RETURN_REQUESTED" } : item,
        ),
      );
      showToast("Return request sent.", "success");
    } catch {
      showToast("Unable to request return for this order.", "error");
    } finally {
      setReturningOrderId(null);
    }
  };

  const handleTrack = (order: Order) => {
    setTrackingOrder(order);
    setTrackingOpen(true);
  };

  const handleCopyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      showToast("Order ID copied.", "success");
    } catch {
      showToast("Unable to copy order ID.", "error");
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="orders-page">
        <div className="orders-breadcrumb">
          <Link href="/" className="wishlist-back-link">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
          <span>/</span>
          <strong>Orders</strong>
        </div>

        <section className="orders-hero">
          <div>
            <p className="eyebrow">Order history</p>
            <h1>Track every order from one elegant place.</h1>
            <p>
              Review invoices, delivery progress, item details, and cancellation
              options for your recent purchases.
            </p>
          </div>

          <div className="orders-hero-panel">
            <span>
              <ShieldCheck className="size-4" />
              Protected checkout
            </span>
            <span>
              <RotateCcw className="size-4" />
              7 day support window
            </span>
          </div>
        </section>

        <section className="orders-stat-grid">
          <div className="orders-stat-card">
            <Package className="size-5" />
            <span>Total orders</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="orders-stat-card">
            <Truck className="size-5" />
            <span>Active orders</span>
            <strong>{orderStats.active}</strong>
          </div>
          <div className="orders-stat-card">
            <PackageCheck className="size-5" />
            <span>Delivered</span>
            <strong>{orderStats.delivered}</strong>
          </div>
          <div className="orders-stat-card">
            <ReceiptText className="size-5" />
            <span>Total spent</span>
            <strong>{formatCurrencyFromPaise(orderStats.totalSpent)}</strong>
          </div>
        </section>

        <section className="orders-toolbar">
          <div className="orders-search">
            <Search className="size-4" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by order ID or product"
              aria-label="Search orders"
            />
          </div>

          <div className="orders-filter-row" aria-label="Filter orders by status">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={statusFilter === tab.value ? "is-active" : ""}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <OrderSkeleton />
        ) : orders.length === 0 ? (
          <Card className="orders-empty-card py-0 shadow-none">
            <CardContent className="orders-empty-content">
              <ShoppingBag className="size-10" />
              <h2>No orders yet</h2>
              <p>Your order history will appear here after checkout.</p>
              <CtaButton asChild>
                <Link href="/">Start shopping</Link>
              </CtaButton>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="orders-empty-card py-0 shadow-none">
            <CardContent className="orders-empty-content">
              <Search className="size-10" />
              <h2>No matching orders</h2>
              <p>Try another order ID, product name, or status filter.</p>
              <Button
                type="button"
                variant="outline"
                className="orders-outline-button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("ALL");
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section className="orders-list">
            {filteredOrders.map((order) => {
              const status = normalizeStatus(order.status);
              const isCancelled = status === "CANCELLED";
              const isDelivered = status === "DELIVERED";
              const isReturnRequested = status === "RETURN_REQUESTED";
              const isReturned = status === "RETURNED";
              const activeStep = getStepIndex(order.status);
              const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
              const canCancel = !isCancelled && !isDelivered && !isReturnRequested && !isReturned;
              const canRequestReturn = isDelivered;
              const addressParts = [
                order.address?.line1,
                order.address?.line2,
                order.address?.city,
                order.address?.state,
                order.address?.pincode,
              ].filter(Boolean);

              return (
                <Card key={order.id} className="orders-card py-0 shadow-none">
                  <CardContent className="orders-card-content">
                    <div className="orders-card-head">
                      <div>
                        <span className="orders-status-kicker">
                          <Clock3 className="size-4" />
                          Placed {formatDate(order.createdAt)}
                        </span>
                        <h2>Order #{order.id.slice(-8).toUpperCase()}</h2>
                        <p>{itemCount} item(s) - {getStatusCopy(order.status)}</p>
                      </div>

                      <div className={`orders-status-pill status-${status.toLowerCase()}`}>
                        {isCancelled ? <XCircle className="size-4" /> : <BadgeCheck className="size-4" />}
                        {status}
                      </div>
                    </div>

                    <div className="orders-progress-row">
                      {timelineSteps.map((step, index) => {
                        const Icon = step.icon;
                        const isDone = !isCancelled && index < activeStep;
                        const isActive = !isCancelled && index === activeStep;

                        return (
                          <span
                            key={step.label}
                            className={`${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
                          >
                            {isDone ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                            {step.label}
                          </span>
                        );
                      })}
                    </div>

                    <div className="orders-card-grid">
                      <div className="orders-items-panel">
                        {order.items?.map((item) => {
                          const productName = item.productName || item.variant?.product?.name || "Product";
                          const lineTotal = (item.priceAtOrder || 0) * item.quantity;

                          return (
                            <div key={item.id} className="orders-item-row">
                              <div className="orders-item-thumb">
                                {productName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{productName}</strong>
                                <span>{item.variantName || "Standard variant"}</span>
                                <small>Qty {item.quantity} - {formatCurrencyFromPaise(lineTotal)}</small>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <aside className="orders-summary-panel">
                        <div>
                          <span>{order.paymentStatus === "PAID" ? "Total paid" : "Order total"}</span>
                          <strong>{formatCurrencyFromPaise(order.totalAmount)}</strong>
                        </div>
                        <div>
                          <span>Payment</span>
                          <strong>{getPaymentMethodLabel(order)} - {getPaymentStatusLabel(order)}</strong>
                        </div>
                        {order.paymentStatus === "PAID" && order.paymentId ? (
                          <div>
                            <span>Payment ID</span>
                            <strong>{order.paymentId}</strong>
                          </div>
                        ) : null}
                        <div>
                          <span>Delivery estimate</span>
                          <strong>{isDelivered ? "Delivered" : isCancelled ? "Stopped" : getDeliveryEstimate(order)}</strong>
                        </div>
                        <div>
                          <span>Ship to</span>
                          <strong>{addressParts.length ? addressParts.join(", ") : "Saved checkout address"}</strong>
                        </div>
                      </aside>
                    </div>

                    <div className="orders-card-actions">
                      <Button type="button" className="orders-primary-button" onClick={() => handleTrack(order)} disabled={isCancelled}>
                        <Truck className="size-4" />
                        Track order
                      </Button>
                      <Button type="button" variant="outline" className="orders-outline-button" onClick={() => handleCopyOrderId(order.id)}>
                        <Copy className="size-4" />
                        Copy ID
                      </Button>
                      <Button type="button" variant="outline" className="orders-outline-button">
                        <Download className="size-4" />
                        Invoice
                      </Button>
                      <Button type="button" variant="outline" className="orders-outline-button">
                        <FileText className="size-4" />
                        Support
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="orders-cancel-button"
                        onClick={() => handleCancel(order)}
                        disabled={!canCancel || cancellingOrderId === order.id}
                      >
                        <XCircle className="size-4" />
                        {cancellingOrderId === order.id ? "Cancelling..." : "Cancel"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="orders-outline-button"
                        onClick={() => requestReturn(order)}
                        disabled={!canRequestReturn || returningOrderId === order.id}
                      >
                        <RotateCcw className="size-4" />
                        {returningOrderId === order.id ? "Requesting..." : "Request Return"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </main>

      <OrderTrackingModal
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        order={trackingOrder}
      />

      <Dialog open={Boolean(cancelOrder)} onOpenChange={(open) => {
        if (!open && !cancellingOrderId) setCancelOrder(null);
      }}>
        <DialogContent className="overflow-hidden border-neutral-200 bg-white p-0 text-neutral-950 sm:max-w-md">
          <DialogHeader className="p-5 pb-0">
            <div className="mb-1 grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
              <XCircle className="size-5" />
            </div>
            <DialogTitle className="text-2xl font-bold leading-tight">
              Cancel this order?
            </DialogTitle>
            <DialogDescription className="leading-6 text-neutral-600">
              This will stop order #{cancelOrder?.id.slice(-8).toUpperCase()} from being processed.
              {cancelOrder?.paymentStatus === "PAID"
                ? " Refund or reversal details will be handled through the original payment method."
                : " No online payment has been captured for this order."}
            </DialogDescription>
          </DialogHeader>

          <div className="mx-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-500">Order total</span>
              <strong>{formatCurrencyFromPaise(cancelOrder?.totalAmount || 0)}</strong>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-neutral-500">Payment</span>
              <strong>
                {cancelOrder ? getPaymentStatusLabel(cancelOrder) : "-"}
              </strong>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-xl border-neutral-200 bg-neutral-50 p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOrder(null)}
              disabled={Boolean(cancellingOrderId)}
            >
              Keep Order
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
              onClick={confirmCancelOrder}
              disabled={Boolean(cancellingOrderId)}
            >
              {cancellingOrderId ? "Cancelling..." : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </>
  );
}
