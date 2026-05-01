
import { NextRequest, NextResponse } from "next/server";
import { type OrderStatus, getValidNextStatuses } from "@/lib/admin-store";
import { prisma } from "@/lib/prisma";
import { adminOrderInclude, formatAdminOrder } from "@/lib/admin-orders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { NotifType } from "@prisma/client";

const typeMap: Record<OrderStatus, NotifType> = {
  PENDING: "ORDER_PLACED",
  CONFIRMED: "ORDER_CONFIRMED",
  SHIPPED: "ORDER_SHIPPED",
  DELIVERED: "ORDER_DELIVERED",
  RETURN_REQUESTED: "ORDER_DELIVERED",
  RETURNED: "ORDER_RETURNED",
  CANCELLED: "ORDER_CANCELLED",
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { status?: OrderStatus };

    if (!body.status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const requestedStatus = body.status;

    const { order, shouldNotify } = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        select: {
          status: true,
          items: {
            select: {
              quantity: true,
              variantId: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (existingOrder.status === requestedStatus) {
        const order = await tx.order.findUnique({
          where: { id },
          include: adminOrderInclude,
        });

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        return { order, shouldNotify: false };
      }

      if (!getValidNextStatuses(existingOrder.status).includes(requestedStatus)) {
        throw new Error("INVALID_STATUS_TRANSITION");
      }

      const statusUpdate = await tx.order.updateMany({
        where: {
          id,
          status: existingOrder.status,
        },
        data: { status: requestedStatus },
      });

      if (statusUpdate.count !== 1) {
        throw new Error("ORDER_STATUS_CHANGED");
      }

      if (requestedStatus === "CANCELLED") {
        await Promise.all(
          existingOrder.items.map((item) =>
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
      }

      const order = await tx.order.findUnique({
        where: { id },
        include: adminOrderInclude,
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      return { order, shouldNotify: true };
    });

    if (shouldNotify) {
      await createNotification(order.userId, typeMap[requestedStatus], { orderId: id });
    }

    return NextResponse.json({ order: formatAdminOrder(order) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (message === "INVALID_STATUS_TRANSITION") {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    if (message === "ORDER_STATUS_CHANGED") {
      return NextResponse.json(
        { error: "Order status changed while this request was processing. Please refresh and try again." },
        { status: 409 }
      );
    }

    console.error("PATCH /api/admin/orders/[id]/status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
