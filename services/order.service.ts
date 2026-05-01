import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

type StockNotification = {
  productName: string;
  variantName: string;
  stock: number;
};

type DeliveryMethod = "standard" | "express";
type PaymentMethod = "ONLINE" | "CASH_ON_DELIVERY";

function getCheckoutAmountPaise({
  subtotal,
  deliveryMethod,
  giftWrap,
}: {
  subtotal: number;
  deliveryMethod: DeliveryMethod;
  giftWrap: boolean;
}) {
  const baseShipping = subtotal >= 18000 ? 0 : 1200;
  const shipping = deliveryMethod === "express" ? baseShipping + 1800 : baseShipping;
  const giftWrapCharge = giftWrap ? 900 : 0;
  const tax = Math.round(subtotal * 0.08);

  return subtotal + shipping + giftWrapCharge + tax;
}

export const getOrdersByUserId = async (userId: string) => {
  return await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      address: true,
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
    },
  });
};

export const cancelOrderById = async (orderId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            quantity: true,
            variantId: true,
          },
        },
      },
    });

    if (!order || order.userId !== userId) throw new Error("Order not found or unauthorized");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") throw new Error("Cannot cancel this order");

    const statusUpdate = await tx.order.updateMany({
      where: {
        id: orderId,
        status: order.status,
      },
      data: { status: "CANCELLED" },
    });

    if (statusUpdate.count !== 1) {
      throw new Error("Order status changed. Please refresh and try again.");
    }

    await Promise.all(
      order.items.map((item) =>
        tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })
      )
    );

    const updatedOrder = await tx.order.findUnique({ where: { id: orderId } });
    if (!updatedOrder) throw new Error("Order not found or unauthorized");

    return updatedOrder;
  });
};

export const requestReturnById = async (orderId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.userId !== userId) throw new Error("Order not found or unauthorized");
  if (order.status !== "DELIVERED") throw new Error("Only delivered orders can be returned");

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "RETURN_REQUESTED" },
  });
};

export const createOrder = async ({
  userId,
  addressId,
  deliveryMethod = "standard",
  giftWrap = false,
  paymentMethod = "CASH_ON_DELIVERY",
  paymentId,
  paymentProviderOrderId,
}: {
  userId: string;
  addressId: string;
  deliveryMethod?: DeliveryMethod;
  giftWrap?: boolean;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  paymentProviderOrderId?: string;
}) => {
  const stockNotifications: StockNotification[] = [];

  const order = await prisma.$transaction(async (tx) => {
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("User not found");

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.variant.price,
      0
    );
    const totalAmount = getCheckoutAmountPaise({
      subtotal,
      deliveryMethod,
      giftWrap,
    });

    for (const item of cartItems) {
      const stockUpdate = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (stockUpdate.count !== 1) {
        const currentVariant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            product: {
              select: { name: true },
            },
          },
        });
        const availableStock = currentVariant?.stock ?? 0;
        const productName = currentVariant?.product.name ?? item.variant.product.name;
        const variantName = currentVariant?.name ?? item.variant.name;

        throw new Error(
          availableStock <= 0
            ? `${productName} (${variantName}) is out of stock`
            : `Only ${availableStock} item(s) available for ${productName} (${variantName})`
        );
      }

      const updatedVariant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: {
          product: {
            select: { name: true },
          },
        },
      });

      if (updatedVariant && updatedVariant.stock < 5) {
        stockNotifications.push({
          productName: updatedVariant.product.name,
          variantName: updatedVariant.name,
          stock: updatedVariant.stock,
        });
      }
    }

    const order = await tx.order.create({
      data: {
        userId,
        addressId,

        customerName: user.name || "Customer",
        customerEmail: user.email || "",

        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === "ONLINE" ? "PAID" : "PENDING",
        paymentProvider: paymentMethod === "ONLINE" ? "Razorpay" : null,
        paymentId: paymentMethod === "ONLINE" ? paymentId : null,
        paymentProviderOrderId:
          paymentMethod === "ONLINE" ? paymentProviderOrderId : null,
        paidAt: paymentMethod === "ONLINE" ? new Date() : null,

        items: {
          create: cartItems.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,

            productName: item.variant.product.name,
            variantName: item.variant.name,
            priceAtOrder: item.variant.price,
          })),
        },
      },
      include: {
        items: true,
        address: true,
      },
    });

    await tx.cartItem.deleteMany({
      where: { userId },
    });

    return order;
  });

  try {
    await Promise.all(
      stockNotifications.map((notification) =>
        notifyAdmins("LOW_STOCK", notification)
      )
    );
  } catch (error) {
    console.error("Failed to send low-stock notifications", error);
  }

  return order;
};
