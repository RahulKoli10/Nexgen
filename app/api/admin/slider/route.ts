import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const slides = await prisma.sliderImage.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(slides);
  } catch (error) {
    console.error("GET Slider Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const alt = formData.get("alt") as string | null;
    const title = formData.get("title") as string | null;
    const subtitle = formData.get("subtitle") as string | null;
    const linkUrl = formData.get("linkUrl") as string | null;
    const active = formData.get("active") === "true";

    if (!file) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    // Convert file to base64 for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const fileUri = `data:${file.type};base64,${base64Data}`;

    const uploadResponse = await cloudinary.uploader.upload(fileUri, {
      folder: "slider",
    });

    // Get current max order
    const maxOrder = await prisma.sliderImage.aggregate({
      _max: { order: true },
    });

    const newOrder = (maxOrder._max.order ?? -1) + 1;

    const sliderImage = await prisma.sliderImage.create({
      data: {
        url: uploadResponse.secure_url,
        publicId: uploadResponse.public_id,
        alt: alt || null,
        title: title || null,
        subtitle: subtitle || null,
        linkUrl: linkUrl || null,
        active,
        order: newOrder,
      },
    });

    return NextResponse.json(sliderImage, { status: 201 });
  } catch (error: any) {
    console.error("POST Slider Error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
