"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Pencil, 
  X, 
  Check, 
  Loader2, 
  Image as ImageIcon,
  ExternalLink,
  Save,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface SliderImage {
  id: string;
  url: string;
  publicId: string;
  alt: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SliderPage() {
  const [slides, setSlides] = useState<SliderImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState({
    alt: "",
    title: "",
    subtitle: "",
    linkUrl: "",
    active: true
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [editData, setEditData] = useState({
    alt: "",
    title: "",
    subtitle: "",
    linkUrl: "",
    active: true
  });

  const fetchSlides = useCallback(async () => {
    try {
      const response = await axios.get("/api/admin/slider");
      setSlides(response.data);
    } catch (error) {
      toast.error("Failed to load slider images");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
        toast.error("Only JPG, PNG and WEBP are allowed");
        return;
      }
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("alt", uploadData.alt);
    formData.append("title", uploadData.title);
    formData.append("subtitle", uploadData.subtitle);
    formData.append("linkUrl", uploadData.linkUrl);
    formData.append("active", String(uploadData.active));

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post("/api/admin/slider", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      setSlides((prev) => [...prev, response.data].sort((a, b) => a.order - b.order));
      toast.success("Slide added successfully");
      resetUploadForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to upload slide");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadData({
      alt: "",
      title: "",
      subtitle: "",
      linkUrl: "",
      active: true
    });
    setUploadProgress(0);
    setIsAdding(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/api/admin/slider/${id}`, { active: !currentStatus });
      setSlides((prev) => 
        prev.map((s) => s.id === id ? { ...s, active: !currentStatus } : s)
      );
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/admin/slider/${id}`);
      setSlides((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slide deleted");
    } catch (error) {
      toast.error("Failed to delete slide");
    }
  };

  const startEditing = (slide: SliderImage) => {
    setEditingId(slide.id);
    setEditData({
      alt: slide.alt || "",
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      linkUrl: slide.linkUrl || "",
      active: slide.active
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const response = await axios.patch(`/api/admin/slider/${editingId}`, editData);
      setSlides((prev) => 
        prev.map((s) => s.id === editingId ? response.data : s)
      );
      toast.success("Slide updated");
      setEditingId(null);
    } catch (error) {
      toast.error("Failed to update slide");
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(slides);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setSlides(updatedItems);

    try {
      await axios.patch("/api/admin/slider/reorder", {
        items: updatedItems.map((item) => ({ id: item.id, order: item.order }))
      });
      toast.success("Order saved");
    } catch (error) {
      toast.error("Failed to save order");
      fetchSlides(); 
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#2C2C2A]">Slider Management</h1>
          <p className="mt-1 text-sm text-[#888780]">Manage home page carousel slides.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition active:scale-[0.98] ${
            isAdding 
              ? "bg-[#F1EFE8] text-[#5F5E5A] border border-[#D3D1C7] hover:bg-[#D3D1C7]/50" 
              : "bg-[#185FA5] text-white hover:bg-[#185FA5]/90 shadow-sm"
          }`}
        >
          {isAdding ? <X className="size-4" /> : <Plus className="size-4" />}
          {isAdding ? "Cancel" : "Add Slide"}
        </button>
      </div>

      {isAdding && (
        <section className="rounded-xl border border-[#D3D1C7] bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleUpload} className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <label htmlFor="slide-upload" className="block text-xs font-bold uppercase tracking-wider text-[#888780]">
                Slide Image
              </label>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-dashed border-[#D3D1C7] bg-[#F1EFE8] flex items-center justify-center transition-colors hover:border-[#185FA5]/50 group">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-[#D3D1C7] group-hover:text-[#185FA5]/30 transition-colors" />
                    <p className="mt-2 text-sm text-[#888780]">Click or drag to upload image</p>
                    <p className="text-[10px] text-[#888780]/60 mt-1">JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                )}
                <input
                  id="slide-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="upload-active"
                  type="checkbox"
                  checked={uploadData.active}
                  onChange={(e) => setUploadData({ ...uploadData, active: e.target.checked })}
                  className="h-4 w-4 rounded border-[#D3D1C7] text-[#185FA5] focus:ring-[#185FA5]"
                />
                <label htmlFor="upload-active" className="text-sm font-medium text-[#2C2C2A]">
                  Visible on site immediately
                </label>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="upload-alt" className="text-xs font-bold uppercase tracking-wider text-[#888780]">
                  Alt text — describe the image for SEO
                </label>
                <Input 
                  id="upload-alt"
                  placeholder="e.g. Modern living room furniture set" 
                  value={uploadData.alt}
                  onChange={(e) => setUploadData({ ...uploadData, alt: e.target.value })}
                  className="h-10 rounded-lg border-[#D3D1C7] focus:border-[#185FA5] focus:ring-4 focus:ring-[#185FA5]/10"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="upload-title" className="text-xs font-bold uppercase tracking-wider text-[#888780]">
                  Slide heading (optional)
                </label>
                <Input 
                  id="upload-title"
                  placeholder="e.g. New Arrivals 2024" 
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="h-10 rounded-lg border-[#D3D1C7] focus:border-[#185FA5] focus:ring-4 focus:ring-[#185FA5]/10"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="upload-subtitle" className="text-xs font-bold uppercase tracking-wider text-[#888780]">
                  Slide subtext (optional)
                </label>
                <Input 
                  id="upload-subtitle"
                  placeholder="e.g. Discover our latest collection" 
                  value={uploadData.subtitle}
                  onChange={(e) => setUploadData({ ...uploadData, subtitle: e.target.value })}
                  className="h-10 rounded-lg border-[#D3D1C7] focus:border-[#185FA5] focus:ring-4 focus:ring-[#185FA5]/10"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="upload-link" className="text-xs font-bold uppercase tracking-wider text-[#888780]">
                  Link URL e.g. /products?category=sale (optional)
                </label>
                <Input 
                  id="upload-link"
                  placeholder="e.g. /shop/new-arrivals" 
                  value={uploadData.linkUrl}
                  onChange={(e) => setUploadData({ ...uploadData, linkUrl: e.target.value })}
                  className="h-10 rounded-lg border-[#D3D1C7] focus:border-[#185FA5] focus:ring-4 focus:ring-[#185FA5]/10"
                />
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit" 
                  className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[#185FA5] text-sm font-semibold text-white transition hover:bg-[#185FA5]/90 disabled:opacity-50"
                  disabled={isUploading || !file}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Upload Slide
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="slides">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="grid gap-3"
            >
              {slides.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D3D1C7] py-16 text-center bg-white/50">
                  <ImageIcon className="size-12 text-[#D3D1C7]" />
                  <p className="mt-4 font-medium text-[#2C2C2A]">No slides yet</p>
                  <p className="text-sm text-[#888780]">Click "Add Slide" to create your first homepage banner.</p>
                </div>
              ) : (
                slides.map((slide, index) => (
                  <Draggable key={slide.id} draggableId={slide.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative flex items-center gap-4 rounded-xl border border-[#D3D1C7] bg-white p-4 shadow-sm transition-all ${
                          snapshot.isDragging ? "shadow-xl border-[#185FA5]/50 ring-2 ring-[#185FA5]/10 z-50" : "hover:border-[#185FA5]/30 hover:shadow-md"
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="text-[#D3D1C7] hover:text-[#888780] transition-colors cursor-grab active:cursor-grabbing">
                          <GripVertical className="size-5" />
                        </div>
                        
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-[#F1EFE8] bg-[#F1EFE8]">
                          <Image src={slide.url} alt={slide.alt || ""} fill className="object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {editingId === slide.id ? (
                            <form onSubmit={handleUpdate} className="grid gap-3 py-1">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="grid gap-1">
                                  <label htmlFor={`edit-title-${slide.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">Heading</label>
                                  <Input 
                                    id={`edit-title-${slide.id}`}
                                    value={editData.title}
                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                    className="h-8 text-sm rounded-md border-[#D3D1C7]"
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <label htmlFor={`edit-subtitle-${slide.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">Subtext</label>
                                  <Input 
                                    id={`edit-subtitle-${slide.id}`}
                                    value={editData.subtitle}
                                    onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                                    className="h-8 text-sm rounded-md border-[#D3D1C7]"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="grid gap-1">
                                  <label htmlFor={`edit-alt-${slide.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">Alt Text</label>
                                  <Input 
                                    id={`edit-alt-${slide.id}`}
                                    value={editData.alt}
                                    onChange={(e) => setEditData({ ...editData, alt: e.target.value })}
                                    className="h-8 text-sm rounded-md border-[#D3D1C7]"
                                    required
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <label htmlFor={`edit-link-${slide.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">Link URL</label>
                                  <Input 
                                    id={`edit-link-${slide.id}`}
                                    value={editData.linkUrl}
                                    onChange={(e) => setEditData({ ...editData, linkUrl: e.target.value })}
                                    className="h-8 text-sm rounded-md border-[#D3D1C7]"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2 mt-1">
                                <button type="button" onClick={() => setEditingId(null)} className="text-xs font-semibold text-[#888780] hover:text-[#2C2C2A] px-2 py-1">
                                  Cancel
                                </button>
                                <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#185FA5] px-4 text-xs font-semibold text-white hover:bg-[#185FA5]/90">
                                  <Save className="size-3" />
                                  Update Slide
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-[#2C2C2A] truncate">
                                  {slide.title || <span className="text-[#888780]/40 italic font-normal">Untitled Slide</span>}
                                </h3>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  slide.active ? "bg-[#EAF3DE] text-[#27500A]" : "bg-[#F1EFE8] text-[#5F5E5A]"
                                }`}>
                                  {slide.active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <p className="text-sm text-[#888780] truncate">
                                {slide.subtitle || <span className="text-[#888780]/40 italic">No subtext provided</span>}
                              </p>
                              {slide.linkUrl && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#185FA5] hover:underline cursor-pointer">
                                  <ExternalLink className="size-3" />
                                  {slide.linkUrl}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {editingId !== slide.id && (
                            <>
                              <button
                                onClick={() => handleToggleActive(slide.id, slide.active)}
                                className={`inline-flex size-9 items-center justify-center rounded-lg border transition ${
                                  slide.active 
                                    ? "border-[#D3D1C7] text-[#27500A] bg-[#EAF3DE]/50 hover:bg-[#EAF3DE]" 
                                    : "border-[#D3D1C7] text-[#888780] bg-[#F1EFE8] hover:bg-[#D3D1C7]/30"
                                }`}
                                title={slide.active ? "Set Inactive" : "Set Active"}
                              >
                                {slide.active ? <Check className="size-4" /> : <Save className="size-4" />}
                              </button>
                              <button
                                onClick={() => startEditing(slide)}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#D3D1C7] text-[#5F5E5A] bg-white hover:bg-[#F1EFE8] transition"
                                title="Edit Details"
                              >
                                <Pencil className="size-4" />
                              </button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    className="inline-flex size-9 items-center justify-center rounded-lg border border-[#E24B4A]/20 text-[#E24B4A] bg-[#E24B4A]/5 hover:bg-[#E24B4A] hover:text-white transition"
                                    title="Delete Slide"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-xl border-[#D3D1C7]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-[#2C2C2A]">Delete Slide Image?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-[#888780]">
                                      This will permanently remove the slide from your homepage and delete the image from Cloudinary storage.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-lg border-[#D3D1C7] text-[#5F5E5A]">Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(slide.id)}
                                      className="rounded-lg bg-[#E24B4A] text-white hover:bg-[#E24B4A]/90"
                                    >
                                      Delete Permanently
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
