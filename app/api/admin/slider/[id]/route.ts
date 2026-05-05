import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const existingSlide = await prisma.sliderImage.findUnique({
      where: { id },
    });

    if (!existingSlide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    let updateData: any = {};
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      const alt = formData.get("alt");
      const title = formData.get("title");
      const subtitle = formData.get("subtitle");
      const linkUrl = formData.get("linkUrl");
      const active = formData.get("active");
      const order = formData.get("order");
      file = formData.get("file") as File | null;

      if (alt !== null) updateData.alt = String(alt);
      if (title !== null) updateData.title = String(title);
      if (subtitle !== null) updateData.subtitle = String(subtitle);
      if (linkUrl !== null) updateData.linkUrl = String(linkUrl);
      if (active !== null) updateData.active = active === "true";
      if (order !== null) updateData.order = parseInt(String(order));
    } else {
      const body = await request.json();
      updateData = {
        alt: body.alt,
        title: body.title,
        subtitle: body.subtitle,
        linkUrl: body.linkUrl,
        active: body.active,
        order: body.order,
      };
    }

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

      if (existingSlide.publicId) {
        await cloudinary.uploader.destroy(existingSlide.publicId).catch(err => 
          console.error("Cloudinary Delete Error:", err)
        );
      }

      updateData.url = uploaded.secure_url;
      updateData.publicId = uploaded.public_id;
    }

    const updated = await prisma.sliderImage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH Slider Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const sliderImage = await prisma.sliderImage.findUnique({
      where: { id },
    });

    if (!sliderImage) {
      return NextResponse.json({ error: "Slider image not found" }, { status: 404 });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(sliderImage.publicId);

    // Delete from DB
    await prisma.sliderImage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Slider Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
