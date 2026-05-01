import { NextRequest, NextResponse } from "next/server";
import { Prisma, OrderStatus } from "@prisma/client";
import { adminOrderInclude, formatAdminOrder } from "@/lib/admin-orders";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PAGE_SIZE } from "@/components/admin/constants";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status") ?? "";
  const searchParam = params.get("search")?.trim().toLowerCase() ?? "";
  const fromParam = params.get("from") ?? "";
  const toParam = params.get("to") ?? "";
  
  const rawPage = Number(params.get("page") ?? 1);
  const rawLimit = Number(params.get("limit") ?? PAGE_SIZE);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, rawLimit) : 10;

  const where: Prisma.OrderWhereInput = {};

  if (statusParam && statusParam !== "ALL") {
    where.status = statusParam as OrderStatus;
  }

  if (searchParam) {
    where.OR = [
      { id: { contains: searchParam, mode: "insensitive" } },
      { customerEmail: { contains: searchParam, mode: "insensitive" } },
      { customerName: { contains: searchParam, mode: "insensitive" } },
    ];
  }

  if (fromParam || toParam) {
    where.createdAt = {};
    if (fromParam) {
      where.createdAt.gte = new Date(`${fromParam}T00:00:00Z`);
    }
    if (toParam) {
      where.createdAt.lte = new Date(`${toParam}T23:59:59Z`);
    }
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: adminOrderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const formattedOrders = orders.map(formatAdminOrder);

  return NextResponse.json({
    orders: formattedOrders,
    total,
    page,
    limit,
  });
}

