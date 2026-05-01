import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-api";
import { adminOrderInclude, formatAdminOrder } from "@/lib/admin-orders";

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await context.params;

  try {
    const order = await prisma.$transaction(async (tx) => {
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

      if (!existingOrder) throw new Error("ORDER_NOT_FOUND");
      if (existingOrder.status !== "RETURN_REQUESTED") throw new Error("RETURN_NOT_REQUESTED");

      await tx.order.update({
        where: { id },
        data: { status: "RETURNED" },
      });

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

      const updatedOrder = await tx.order.findUnique({
        where: { id },
        include: adminOrderInclude,
      });

      if (!updatedOrder) throw new Error("ORDER_NOT_FOUND");

      await tx.notification.create({
        data: {
          userId: updatedOrder.userId,
          orderId: id,
          type: "ORDER_RETURNED",
          title: "Return Approved",
          message: `Your return for order #${id.slice(-8).toUpperCase()} has been approved.`,
          link: `/orders/${id}`,
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({ order: formatAdminOrder(order), success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (message === "RETURN_NOT_REQUESTED") {
      return NextResponse.json({ error: "Order does not have a return request" }, { status: 400 });
    }

    console.error("PATCH /api/admin/orders/[id]/return error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
