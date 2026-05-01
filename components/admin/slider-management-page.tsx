"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import axios from "axios";
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { SliderImage } from "@/components/admin/types";

function SortableSliderImage({
  image,
  onAltChange,
  onActiveChange,
  onDelete,
  isDeleting,
}: {
  image: SliderImage;
  onAltChange: (id: string, alt: string) => void;
  onActiveChange: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="grid gap-4 rounded-md border border-[#D3D1C7] bg-white p-4 md:grid-cols-[auto_112px_1fr_auto]"
    >
      <button
        type="button"
        className="flex size-10 items-center justify-center rounded-md border border-[#D3D1C7] text-[#5F5E5A]"
        aria-label="Reorder image"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="relative h-28 w-full overflow-hidden rounded-md border border-[#D3D1C7] bg-[#F1EFE8] md:w-28">
        <Image src={image.url} alt={image.alt || ""} fill className="object-cover" sizes="112px" />
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-[#2C2C2A]">
          Alt text
          <input
            value={image.alt ?? ""}
            onChange={(event) => onAltChange(image.id, event.target.value)}
            onBlur={(event) => onAltChange(image.id, event.target.value)}
            className="h-10 rounded-md border border-[#D3D1C7] px-3 text-sm outline-none focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/10"
            placeholder="Describe this hero image"
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-[#2C2C2A]">
          <input
            type="checkbox"
            checked={image.active}
            onChange={(event) => onActiveChange(image.id, event.target.checked)}
            className="size-4 accent-[#185FA5]"
          />
          Active
        </label>
      </div>
      <button
        type="button"
        onClick={() => onDelete(image.id)}
        disabled={isDeleting}
        className="inline-flex size-10 items-center justify-center rounded-md border border-red-100 text-[#E24B4A] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Delete slider image"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function SliderManagementPage() {
  const [images, setImages] = useState<SliderImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  async function loadImages() {
    const { data } = await axios.get("/api/admin/slider");
    setImages(data.images ?? []);
  }

  useEffect(() => {
    loadImages().catch(() => toast.error("Failed to load slider images."));
  }, []);

  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await axios.post("/api/admin/slider", formData);
      setImages((current) => [...current, data.image]);
      toast.success("Slider image uploaded.");
    } catch {
      toast.error("Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((image) => image.id === active.id);
    const newIndex = images.findIndex((image) => image.id === over.id);
    const nextImages = arrayMove(images, oldIndex, newIndex).map((image, index) => ({ ...image, order: index }));
    setImages(nextImages);

    try {
      await Promise.all(nextImages.map((image) => axios.patch(`/api/admin/slider/${image.id}`, { order: image.order })));
      toast.success("Slider order saved.");
    } catch {
      toast.error("Unable to save slider order.");
      loadImages();
    }
  }

  async function updateImage(id: string, payload: Partial<Pick<SliderImage, "alt" | "active">>) {
    setImages((current) => current.map((image) => (image.id === id ? { ...image, ...payload } : image)));
    try {
      await axios.patch(`/api/admin/slider/${id}`, payload);
    } catch {
      toast.error("Unable to update slider image.");
      loadImages();
    }
  }

  async function deleteImage(id: string) {
    setDeletingId(id);
    try {
      await axios.delete(`/api/admin/slider/${id}`);
      setImages((current) => current.filter((image) => image.id !== id));
      toast.success("Slider image deleted.");
    } catch {
      toast.error("Unable to delete slider image.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2C2C2A]">Homepage Slider</h1>
        <p className="mt-1 text-sm text-[#5F5E5A]">Upload, reorder, and manage homepage hero images.</p>
      </div>

      <section className="rounded-md border border-[#D3D1C7] bg-white p-5 shadow-sm">
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-[#D3D1C7] bg-[#F1EFE8] p-6 text-center text-sm font-medium text-[#2C2C2A]">
          {uploading ? <Loader2 className="size-6 animate-spin text-[#185FA5]" /> : <ImagePlus className="size-6 text-[#185FA5]" />}
          <span>{uploading ? "Uploading..." : "Upload jpg, png, or webp image"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => handleUpload(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map((image) => image.id)} strategy={verticalListSortingStrategy}>
          <section className="grid gap-3">
            {images.map((image) => (
              <SortableSliderImage
                key={image.id}
                image={image}
                onAltChange={(id, alt) => updateImage(id, { alt })}
                onActiveChange={(id, active) => updateImage(id, { active })}
                onDelete={deleteImage}
                isDeleting={deletingId === image.id}
              />
            ))}
          </section>
        </SortableContext>
      </DndContext>
    </div>
  );
}
