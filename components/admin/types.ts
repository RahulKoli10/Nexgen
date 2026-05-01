import type {
  AdminCategory as StoreAdminCategory,
  AdminOrder,
  AdminProduct,
  AdminProductImage,
  AdminProductVariant,
  OrderStatus,
} from "@/lib/admin-store";

export type { AdminOrder, AdminProduct, AdminProductImage, AdminProductVariant, OrderStatus };

export type AdminCategory = StoreAdminCategory & {
  _count?: {
    products: number;
  };
};
export type ProductListResponse = {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  categories: AdminCategory[];
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateInput(value?: Date) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const orderStatusClass: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURN_REQUESTED: "bg-[#FAEEDA] text-[#633806]",
  RETURNED: "bg-[#F1EFE8] text-[#5F5E5A]",
  CANCELLED: "bg-red-100 text-red-800",
};

export type SliderImage = {
  id: string;
  url: string;
  publicId: string;
  alt: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isBanned: boolean;
  isSuperAdmin: boolean;
  // isSuperAdmin: boolean;
  _count: {
    orders: number;
  };
  createdAt: string;
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedDate: string;
  totalOrders: number;
  lifetimeSpend: number;
  recentOrders: Array<{
    id: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: string;
  }>;
};

export const roleStatusClass: Record<string, string> = {
  USER: "bg-slate-100 text-slate-700",
  ADMIN: "bg-purple-100 text-purple-700",
  SUPER_ADMIN: "bg-indigo-100 text-indigo-700",
};

export function productPriceRange(product: AdminProduct) {
  if (!product.variants.length) return "₹0";
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

export function productStockTotal(product: AdminProduct) {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

