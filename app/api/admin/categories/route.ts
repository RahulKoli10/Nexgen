import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { PAGE_SIZE } from "@/components/admin/constants";

const SUGGESTED_FIELDS: Record<string, string[]> = {
  fashion: ["Size", "Color"],
  "men-clothing": ["Size", "Color"],
  electronics: ["Storage", "RAM", "Color"],
  laptops: ["Storage", "RAM", "Color"],
  headphones: ["Color", "Connectivity"],
  gaming: ["Platform", "Edition"],
  books: ["Format"],
  furniture: ["Material", "Color", "Size"],
  "home-appliances": ["Wattage", "Color"],
  kitchen: ["Material", "Color"],
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.max(1, Number(searchParams.get("limit") ?? PAGE_SIZE));

    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.category.count(),
    ]);

    return NextResponse.json({ categories, total, page, limit });
  } catch (error) {
    console.error("GET /api/admin/categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, variantFields: bodyFields } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const variantFields = bodyFields ?? SUGGESTED_FIELDS[slug] ?? ["Name"];

    const category = await prisma.category.create({
      data: { name, slug, variantFields },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("POST /api/admin/categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
