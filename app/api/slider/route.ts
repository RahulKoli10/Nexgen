import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const slides = await prisma.sliderImage.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(slides);
  } catch (error) {
    console.error("Public Slider API Error:", error);
    return NextResponse.json({ error: "Failed to fetch slides" }, { status: 500 });
  }
}
