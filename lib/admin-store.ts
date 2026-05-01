export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURN_REQUESTED" | "RETURNED" | "CANCELLED";

export type AdminOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  addressText?: string;
  adminNote?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentProvider?: string | null;
  paymentId?: string | null;
  paymentProviderOrderId?: string | null;
  paidAt?: string | null;
  items: Array<{
    id: string;
    productId?: string;
    productSlug?: string;
    productImage?: string | null;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  variantFields: string[];
};

export type AdminProductImage = {
  id: string;
  url: string;
  publicId?: string | null;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type AdminProductVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category: AdminCategory;
  isActive: boolean;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  createdAt: string;
};

type ProductPayload = {
  name: string;
  description?: string;
  categoryId: string;
  isActive: boolean;
  images: Array<Omit<AdminProductImage, "id"> & { id?: string }>;
  variants: Array<Omit<AdminProductVariant, "id"> & { id?: string }>;
};

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const adminCategories: AdminCategory[] = [];

const productSeed: AdminProduct[] = [];

const orderSeed: AdminOrder[] = [];

const store = globalThis as typeof globalThis & {
  __adminProducts?: AdminProduct[];
  __adminOrders?: AdminOrder[];
};

const products = (store.__adminProducts ??= productSeed);
const orders = (store.__adminOrders ??= orderSeed);

function hydrateProduct(product: AdminProduct): AdminProduct {
  return {
    ...product,
    category: adminCategories.find((category) => category.id === product.categoryId) ?? adminCategories[0],
    images: [...product.images].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function getCategories() {
  return adminCategories;
}

export function getOrders({ limit = 10 }: { limit?: number } = {}) {
  return listOrders({ limit }).orders;
}

export function formatOrderAddress(order: AdminOrder) {
  if (!order.address) {
    return "";
  }

  return [
    order.address.line1,
    order.address.line2,
    order.address.city,
    order.address.state,
    order.address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function listOrders(params: {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const search = params.search?.trim().toLowerCase() ?? "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);
  const from = params.from ? new Date(`${params.from}T00:00:00`) : null;
  const to = params.to ? new Date(`${params.to}T23:59:59`) : null;

  const filtered = [...orders]
    .filter((order) => !params.status || order.status === params.status)
    .filter(
      (order) =>
        !search ||
        order.id.toLowerCase().includes(search) ||
        (order.customerEmail ?? "").toLowerCase().includes(search)
    )
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((order) => ({ ...order, addressText: formatOrderAddress(order) }));

  return {
    orders: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    page,
    limit,
  };
}

export function getOrder(id: string) {
  const order = orders.find((item) => item.id === id);
  return order ? { ...order, addressText: formatOrderAddress(order) } : null;
}

export function getValidNextStatuses(status: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "CANCELLED"],
    DELIVERED: ["RETURN_REQUESTED"],
    RETURN_REQUESTED: ["RETURNED"],
    RETURNED: [],
    CANCELLED: [],
  };

  return transitions[status];
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  if (!getValidNextStatuses(order.status).includes(status)) return null;

  const previousStatus = order.status;
  order.status = status;

  if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
    order.items.forEach((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      const variant = product?.variants.find((entry) => entry.id === item.variantId);
      if (variant) {
        variant.stock += item.quantity;
      }
    });
  }

  return {
    order: getOrder(id),
    notifications: [
      {
        type: status === "CANCELLED" ? "ORDER_CANCELLED" : `ORDER_${status}`,
        recipient: "user",
        orderId: id,
      },
      ...(status === "CONFIRMED" ? [{ type: "NEW_ORDER", recipient: "admin", orderId: id }] : []),
    ],
  };
}

export function updateOrderNote(id: string, note: string) {
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  order.adminNote = note;
  return getOrder(id);
}

export function getStats() {
  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === "PENDING").length,
    revenue: orders
      .filter((order) => order.status === "DELIVERED")
      .reduce((sum, order) => sum + order.totalAmount, 0),
    lowStockCount: products.flatMap((product) => product.variants).filter((variant) => variant.stock < 5).length,
  };
}

export function getRevenueByDay(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getTime() - (days - index - 1) * dayMs);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const revenue = orders
      .filter((order) => {
        const orderDate = new Date(order.createdAt);
        return order.status === "DELIVERED" && orderDate >= dayStart && orderDate < dayEnd;
      })
      .reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      date: date.toISOString().slice(0, 10),
      revenue,
    };
  });
}

export function getTopProducts() {
  const totals = new Map<string, { name: string; unitsSold: number; revenue: number }>();

  orders
    .filter((order) => order.status === "DELIVERED")
    .flatMap((order) => order.items)
    .forEach((item) => {
      const productKey = item.productId ?? item.productName;
      const current = totals.get(productKey) ?? { name: item.productName, unitsSold: 0, revenue: 0 };
      current.unitsSold += item.quantity;
      current.revenue += item.quantity * item.unitPrice;
      totals.set(productKey, current);
    });

  return [...totals.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
}

export function listProducts(params: {
  search?: string;
  category?: string;
  active?: string;
  page?: number;
  limit?: number;
}) {
  const search = params.search?.trim().toLowerCase() ?? "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);

  const filtered = products
    .map(hydrateProduct)
    .filter((product) => !search || product.name.toLowerCase().includes(search))
    .filter((product) => !params.category || product.categoryId === params.category)
    .filter((product) => {
      if (params.active === "true") return product.isActive;
      if (params.active === "false") return !product.isActive;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    products: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    page,
    limit,
    categories: adminCategories,
  };
}

export function getProduct(id: string) {
  const product = products.find((item) => item.id === id);
  return product ? hydrateProduct(product) : null;
}

export function saveProduct(payload: ProductPayload, id?: string) {
  const category = adminCategories.find((item) => item.id === payload.categoryId) ?? adminCategories[0];
  const normalized: AdminProduct = {
    id: id ?? uid("prod"),
    name: payload.name.trim(),
    description: payload.description?.trim() ?? "",
    categoryId: category.id,
    category,
    isActive: payload.isActive,
    createdAt: id ? products.find((product) => product.id === id)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
    images: payload.images.map((image, index) => ({
      id: image.id ?? uid("img"),
      url: image.url,
      publicId: image.publicId,
      altText: image.altText,
      isPrimary: image.isPrimary,
      sortOrder: index,
    })),
    variants: payload.variants.map((variant) => ({
      id: variant.id ?? uid("var"),
      name: variant.name,
      price: Number(variant.price),
      stock: Number(variant.stock),
      sku: variant.sku,
    })),
  };

  if (id) {
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) return null;
    products[index] = normalized;
    return hydrateProduct(products[index]);
  }

  products.unshift(normalized);
  return hydrateProduct(normalized);
}

export function patchProduct(id: string, payload: Partial<ProductPayload>) {
  const existing = products.find((product) => product.id === id);
  if (!existing) return null;

  return saveProduct(
    {
      name: payload.name ?? existing.name,
      description: payload.description ?? existing.description,
      categoryId: payload.categoryId ?? existing.categoryId,
      isActive: payload.isActive ?? existing.isActive,
      images: payload.images ?? existing.images,
      variants: payload.variants ?? existing.variants,
    },
    id
  );
}

export function softDeleteProduct(id: string) {
  const product = products.find((item) => item.id === id);
  if (!product) return null;
  product.isActive = false;
  return hydrateProduct(product);
}

export function duplicateProduct(id: string) {
  const product = getProduct(id);
  if (!product) return null;
  return saveProduct({
    name: `${product.name} Copy`,
    description: product.description,
    categoryId: product.categoryId,
    isActive: false,
    images: product.images.map(({ url, publicId, altText, isPrimary, sortOrder }) => ({ url, publicId, altText, isPrimary, sortOrder })),
    variants: product.variants.map((variant) => ({
      name: variant.name,
      price: variant.price,
      stock: variant.stock,
      sku: `${variant.sku}-copy`,
    })),
  });
}

export function listVariantsForStock() {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      stock: variant.stock,
    }))
  );
}

export function updateBulkStock(updates: Array<{ variantId: string; stock: number }>) {
  const stockById = new Map(updates.map((update) => [update.variantId, Number(update.stock)]));

  products.forEach((product) => {
    product.variants = product.variants.map((variant) =>
      stockById.has(variant.id) ? { ...variant, stock: stockById.get(variant.id) ?? variant.stock } : variant
    );
  });

  return listVariantsForStock();
}

export function isSkuUnique(sku: string, excludeVariantId?: string) {
  const normalized = sku.trim().toLowerCase();
  return !products
    .flatMap((product) => product.variants)
    .some((variant) => variant.sku.toLowerCase() === normalized && variant.id !== excludeVariantId);
}
