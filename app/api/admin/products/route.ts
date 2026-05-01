
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PAGE_SIZE } from "@/components/admin/constants";

type ProductImageInput = {
  url: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

type ProductVariantInput = {
  name: string;
  sku: string;
  price: number | string;
  stock: number | string;
};

type ProductRequestBody = {
  name: string;
  description?: string;
  categoryId: string;
  isActive?: boolean;
  images?: ProductImageInput[];
  variants?: ProductVariantInput[];
};





export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const search = params.get("search")?.trim() || "";
    const categoryId = params.get("category") || "";
    const activeParam = params.get("active");
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.max(1, Number(params.get("limit") ?? PAGE_SIZE));

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (activeParam === "true") {
      where.isActive = true;
    } else if (activeParam === "false") {
      where.isActive = false;
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

    const formattedProducts = products.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      variants: p.variants.map((v) => ({
        ...v,
        price: v.price / 100,
      })),
    }));

    return NextResponse.json({
      products: formattedProducts,
      total,
      page,
      limit,
      categories,
    });
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as ProductRequestBody;
    
    const baseSlug = generateSlug(body.name);
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        slug,
        categoryId: body.categoryId,
        isActive: body.isActive ?? true,
        images: {
          create: body.images?.map((img, idx) => ({
            url: img.url,
            isPrimary: img.isPrimary || false,
            sortOrder: img.sortOrder ?? idx,
          })) || [],
        },
        variants: {
          create: body.variants?.map((v) => ({
            name: v.name,
            sku: v.sku,
            price: Math.round(Number(v.price) * 100), 
            stock: Number(v.stock),
          })) || [],
        },
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
      },
    });

    const formattedProduct = {
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      variants: product.variants.map(v => ({ ...v, price: v.price / 100 }))
    };

    return NextResponse.json({ product: formattedProduct }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
