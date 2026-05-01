import { prisma } from "./prisma";
import { NotifType } from "@prisma/client";

type NotificationData = {
  orderId?: string;
  productName?: string;
  variantName?: string;
  stock?: number;
};

export async function createNotification(
  userId: string | null,
  type: NotifType,
  data: NotificationData
) {
  let title = "";
  let message = "";
  let link = "";

  switch (type) {
    case "ORDER_PLACED":
      title = "Order Placed";
      message = `Your order #${data.orderId?.slice(-8).toUpperCase()} has been placed successfully.`;
      link = `/orders/${data.orderId}`;
      break;
    case "ORDER_CONFIRMED":
      title = "Order Confirmed";
      message = `Your order #${data.orderId?.slice(-8).toUpperCase()} has been confirmed.`;
      link = `/orders/${data.orderId}`;
      break;
    case "ORDER_SHIPPED":
      title = "Order Shipped";
      message = `Your order #${data.orderId?.slice(-8).toUpperCase()} has been shipped.`;
      link = `/orders/${data.orderId}`;
      break;
    case "ORDER_DELIVERED":
      title = "Order Delivered";
      message = `Your order #${data.orderId?.slice(-8).toUpperCase()} has been delivered. Enjoy!`;
      link = `/orders/${data.orderId}`;
      break;
    case "ORDER_RETURNED":
      title = "Return Approved";
      message = `Your return for order #${data.orderId?.slice(-8).toUpperCase()} has been approved.`;
      link = `/orders/${data.orderId}`;
      break;
    case "ORDER_CANCELLED":
      title = "Order Cancelled";
      message = `Your order #${data.orderId?.slice(-8).toUpperCase()} has been cancelled.`;
      link = `/orders/${data.orderId}`;
      break;
    case "NEW_ORDER":
      title = "New Order Received";
      message = `A new order #${data.orderId?.slice(-8).toUpperCase()} has been placed.`;
      link = `/admin/orders?orderId=${data.orderId}`;
      break;
    case "LOW_STOCK":
      title = data.stock === 0 ? "Out of Stock Alert" : "Low Stock Alert";
      message =
        data.stock === 0
          ? `${data.productName} (${data.variantName}) is out of stock.`
          : `Low stock for ${data.productName} (${data.variantName}). Only ${data.stock ?? "few"} item(s) left.`;
      link = `/admin/products/stock`;
      break;
  }

  return await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      orderId: data.orderId,
    },
  });
}

export async function notifyAdmins(type: NotifType, data: NotificationData) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return await Promise.all(
    admins.map((admin) => createNotification(admin.id, type, data))
  );
}
