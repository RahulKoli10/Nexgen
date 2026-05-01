
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { PAGE_SIZE } from "@/components/admin/constants";


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.max(1, Number(params.get("limit") ?? PAGE_SIZE));

    const [variants, total] = await prisma.$transaction([
      prisma.productVariant.findMany({
        include: { product: { select: { name: true } } },
        orderBy: { sku: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productVariant.count(),
    ]);

    return NextResponse.json({
      variants: variants.map((v) => ({
        variantId: v.id,
        productName: v.product.name,
        variantName: v.name,
        stock: v.stock,
      })),
      total,
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates = body.updates || [];

    for (const update of updates) {
      const variant = await prisma.productVariant.update({
        where: { id: update.variantId },
        data: { stock: Number(update.stock) },
        include: { product: { select: { name: true } } },
      });

      if (variant.stock < 5) {
        await notifyAdmins("LOW_STOCK", {
          productName: variant.product.name,
          variantName: variant.name,
          stock: variant.stock,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/products/bulk-stock error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
