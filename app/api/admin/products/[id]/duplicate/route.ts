import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function generateSlug(name: string) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(
  _request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const newName = `${existing.name} Copy`;
    let baseSlug = generateSlug(newName);
    let slug = baseSlug;
    let counter = 1;

    // Handle slug collisions
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const product = await prisma.product.create({
      data: {
        name: newName,
        description: existing.description,
        brand: existing.brand,
        slug,
        categoryId: existing.categoryId,
        isActive: false, // Start duplicates as inactive for review
        images: {
          create: existing.images.map((img) => ({
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
        },
        variants: {
          create: existing.variants.map((v) => {
            // Use a combination of timestamp and random string for SKU safety
            const uniqueSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
            return {
              name: v.name,
              sku: `${v.sku}-COPY-${uniqueSuffix}`,
              price: v.price, // Store as is (Paise)
              stock: v.stock,
            };
          }),
        },
      },
      include: {
        category: true,
        images: true, // Simplified include for create compatibility
        variants: true,
      },
    });

    // Sort images manually after creation to ensure compatibility across Prisma versions
    const sortedImages = product.images.sort((a, b) => a.sortOrder - b.sortOrder);

    const formattedProduct = {
      ...product,
      images: sortedImages,
      description: product.description || "",
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      // Return price in standard units (Rupees/Dollars) for the UI
      variants: product.variants.map((v) => ({ 
        ...v, 
        price: v.price / 100 
      })),
    };

    return NextResponse.json({ product: formattedProduct }, { status: 201 });
  } catch (error: any) {
    console.error("Error duplicating product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to duplicate product" },
      { status: 500 }
    );
  }
}
