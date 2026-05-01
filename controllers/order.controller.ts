import {
  getOrdersByUserId as getOrdersByUserIdService,
  cancelOrderById as cancelOrderByIdService,
  requestReturnById as requestReturnByIdService,
} from "@/services/order.service";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";


import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/services/order.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type OrderEmailItem = {
  productName: string;
  variantName: string;
  quantity: number;
  priceAtOrder: number;
};

type OrderEmailAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

type OrderEmailData = {
  id: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  createdAt: Date;
  paymentMethod?: string;
  paymentStatus?: string;
  items: OrderEmailItem[];
  address?: OrderEmailAddress | null;
};

function escapeHtml(value?: string | null) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrencyFromPaise(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function buildOrderConfirmationEmail(order: OrderEmailData) {
  const deliveryStart = new Date(order.createdAt);
  deliveryStart.setDate(deliveryStart.getDate() + 3);
  const deliveryEnd = new Date(order.createdAt);
  deliveryEnd.setDate(deliveryEnd.getDate() + 5);

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const addressLines = order.address
    ? [
        order.address.fullName,
        order.address.phone,
        order.address.line1,
        order.address.line2,
        `${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
      ]
        .filter(Boolean)
        .map((line) => escapeHtml(line))
        .join("<br />")
    : "Address details are saved with your order.";

  const rows = order.items
    .map((item) => {
      const lineTotal = item.priceAtOrder * item.quantity;

      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;color:#111827;">${escapeHtml(item.productName)}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:4px;">${escapeHtml(item.variantName)} x ${item.quantity}</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827;">
            ${formatCurrencyFromPaise(lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#000;color:#fff;border-radius:22px 22px 0 0;padding:28px;">
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#d4d4d4;">Order confirmed</div>
          <h1 style="margin:12px 0 0;font-size:30px;line-height:1.2;">Thanks, ${escapeHtml(order.customerName)}.</h1>
          <p style="margin:12px 0 0;color:#e5e7eb;font-size:15px;">Your order has been placed successfully and is now being prepared.</p>
        </div>

        <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 22px 22px;padding:28px;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
            <div style="flex:1;min-width:180px;border:1px solid #e5e7eb;border-radius:16px;padding:16px;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Order ID</div>
              <div style="font-weight:800;margin-top:6px;">#${escapeHtml(order.id)}</div>
            </div>
            <div style="flex:1;min-width:180px;border:1px solid #e5e7eb;border-radius:16px;padding:16px;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Estimated delivery</div>
              <div style="font-weight:800;margin-top:6px;">${dateFormatter.format(deliveryStart)} - ${dateFormatter.format(deliveryEnd)}</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td style="padding-top:18px;font-size:18px;font-weight:800;">Order total</td>
                <td style="padding-top:18px;text-align:right;font-size:22px;font-weight:900;">${formatCurrencyFromPaise(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-top:18px;">
            <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Shipping to</div>
            <div style="line-height:1.65;color:#111827;">${addressLines}</div>
          </div>

          <div style="border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-top:18px;">
            <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Payment</div>
            <div style="line-height:1.65;color:#111827;">
              ${order.paymentStatus === "PAID" ? "Payment paid online" : "Cash on Delivery"}
            </div>
          </div>

          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/orders" style="display:inline-block;margin-top:24px;background:#000;color:#fff;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:800;">
            View order
          </a>

          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
            We will send another update when your order status changes. If you did not place this order, please contact support.
          </p>
        </div>
      </div>
    </div>
  `;
}



export const getOrdersByUserId = async (userId: string) => {
  return await getOrdersByUserIdService(userId);
};

export const cancelOrderById = async (orderId: string, userId: string) => {


  const order = await cancelOrderByIdService(orderId, userId);

  let userEmail = order.customerEmail;
  if (!userEmail) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    userEmail = user?.email || "";
  }
  console.log("User email for cancellation:", userEmail);

  try {
    await sendEmail({
      to: userEmail,
      subject: `Order Cancelled - ${order.id}`,
      html: `<h2>Your order has been cancelled</h2><p>Your order <b>#${order.id}</b> was cancelled. If you have questions, contact support.</p>`
    });
  } catch (e) {
    console.error("Failed to send cancellation email", e);
  }
  console.log(`Order ${order.id} cancelled successfully`);

  return order;
};

export const requestReturnById = async (orderId: string, userId: string) => {
  return requestReturnByIdService(orderId, userId);
};


export async function handleCheckout(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const body = await req.json();
    const {
      addressId,
      deliveryMethod,
      giftWrap,
      paymentMethod,
      paymentId,
      paymentProviderOrderId,
    } = body;

    if (!addressId) {
      return NextResponse.json(
        { error: "Address required" },
        { status: 400 }
      );
    }

    const normalizedPaymentMethod =
      paymentMethod === "ONLINE" ? "ONLINE" : "CASH_ON_DELIVERY";

    if (normalizedPaymentMethod === "ONLINE" && !paymentId) {
      return NextResponse.json(
        { error: "Payment confirmation missing" },
        { status: 400 }
      );
    }


    const order = await createOrder({
      userId,
      addressId,
      deliveryMethod,
      giftWrap,
      paymentMethod: normalizedPaymentMethod,
      paymentId,
      paymentProviderOrderId,
    });

    try {
      await sendEmail({
        to: session.user.email || "",
        subject: `Order Confirmation - ${order.id}`,
        html: buildOrderConfirmationEmail(order),
      });
    } catch (e) {
      console.error("Failed to send order email", e);
    }

    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
