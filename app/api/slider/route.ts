import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET all slides (Admin)
export async function GET() {
  try {
    const slides = await prisma.sliderImage.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(slides);
  } catch (error) {
    console.error("GET SLIDER ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch slides" }, { status: 500 });
  }
}

// POST new slide
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const file = formData.get("file") as File | null;
    const alt = formData.get("alt") as string || "";
    const title = formData.get("title") as string || "";
    const subtitle = formData.get("subtitle") as string || "";
    const linkUrl = formData.get("linkUrl") as string || "";
    const active = formData.get("active") === "true";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploaded = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "slider" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    // Get current max order
    const lastSlide = await prisma.sliderImage.findFirst({
      orderBy: { order: "desc" },
    });
    const nextOrder = lastSlide ? lastSlide.order + 1 : 0;

    // Save to Database
    const newSlide = await prisma.sliderImage.create({
      data: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        alt,
        title,
        subtitle,
        linkUrl,
        order: nextOrder,
        active,
      },
    });

    return NextResponse.json(newSlide);
  } catch (error) {
    console.error("POST SLIDER ERROR:", error);
    return NextResponse.json({ error: "Failed to create slide" }, { status: 500 });
  }
}