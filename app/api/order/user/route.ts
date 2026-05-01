import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrdersByUserId, cancelOrderById, requestReturnById } from "@/controllers/order.controller";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orders = await getOrdersByUserId(session.user.id);
    return Response.json(orders);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { orderId, action } = await req.json();
    if (action === "cancel") {
      const result = await cancelOrderById(orderId, session.user.id);
      return Response.json(result);
    }
    if (action === "return") {
      const result = await requestReturnById(orderId, session.user.id);
      return Response.json(result);
    }
    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
