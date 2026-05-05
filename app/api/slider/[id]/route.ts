import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingSlide = await prisma.sliderImage.findUnique({
      where: { id },
    });

    if (!existingSlide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";
    let updateData: any = {};
    let file: File | null = null;

    // Robust check for request type
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      
      const alt = formData.get("alt");
      const title = formData.get("title");
      const subtitle = formData.get("subtitle");
      const linkUrl = formData.get("linkUrl");
      const active = formData.get("active");
      file = formData.get("file") as File | null;

      if (alt !== null) updateData.alt = String(alt);
      if (title !== null) updateData.title = String(title);
      if (subtitle !== null) updateData.subtitle = String(subtitle);
      if (linkUrl !== null) updateData.linkUrl = String(linkUrl);
      if (active !== null) updateData.active = active === "true";
    } else {
      // Handle JSON (for status toggles)
      const body = await req.json();
      updateData = { ...body };
    }

    // Handle Image Upload if a new file is provided
    if (file && file.size > 0) {
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

      // Delete old image from Cloudinary
      if (existingSlide.publicId) {
        await cloudinary.uploader.destroy(existingSlide.publicId).catch(err => 
          console.error("Cloudinary Delete Error:", err)
        );
      }

      updateData.url = uploaded.secure_url;
      updateData.publicId = uploaded.public_id;
    }

    const updatedSlide = await prisma.sliderImage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSlide);
  } catch (error) {
    console.error("PATCH SLIDE ERROR:", error);
    return NextResponse.json({ error: "Failed to update slide" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slide = await prisma.sliderImage.findUnique({
      where: { id },
    });

    if (!slide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    if (slide.publicId) {
      await cloudinary.uploader.destroy(slide.publicId).catch(err => 
        console.error("Cloudinary Delete Error:", err)
      );
    }

    await prisma.sliderImage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE SLIDE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete slide" }, { status: 500 });
  }
}