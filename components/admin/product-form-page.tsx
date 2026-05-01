"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BadgeIndianRupee, Boxes, GripVertical, Hash, Loader2, Package, Plus, Save, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminCategory, AdminProduct } from "@/components/admin/types";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

type ProductFormPageProps = {
  productId?: string;
};

const variantSchema = z.object({
  id: z.string(),
  name: z.string(),
  fieldValues: z.record(z.string(), z.string()).optional(),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  stock: z.coerce.number().min(0, "Stock must be >= 0"),
  sku: z.string().min(1, "SKU is required"),
  skuError: z.string().optional()
});

const imageSchema = z.object({
  id: z.string(),
  url: z.string(),
  publicId: z.string().optional().nullable(),
  altText: z.string().optional().nullable(),
  isPrimary: z.boolean(),
  sortOrder: z.number(),
  isUploading: z.boolean().optional(),
  progress: z.number().optional()
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  images: z.array(imageSchema),
  variants: z.array(variantSchema).min(1, "At least one variant is required")
}).superRefine((data, ctx) => {
  const skus = data.variants.map(v => v.sku.trim().toLowerCase()).filter(Boolean);
  if (skus.length !== new Set(skus).size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate SKUs found",
      path: ["variants"]
    });
  }
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormValues = z.output<typeof productSchema>;

const emptyVariant = (fields: string[] = []) => {
  const fieldValues: Record<string, string> = {};
  fields.forEach(f => fieldValues[f] = "");
  return {
    id: `new_${crypto.randomUUID()}`,
    name: "",
    fieldValues,
    price: 0,
    stock: 0,
    sku: "",
    skuError: undefined
  };
};

const emptyImage = () => ({
  id: `new_${crypto.randomUUID()}`,
  url: "",
  publicId: null,
  altText: "",
  isPrimary: false,
  sortOrder: 0,
  isUploading: false,
  progress: 0
});

function SortableImageRow({
  image,
  onChange,
  onPrimary,
  onRemove,
  onAltChange,
}: {
  image: { id: string; url: string; isPrimary: boolean; isUploading?: boolean; progress?: number; altText?: string | null };
  onChange: (value: string) => void;
  onPrimary: () => void;
  onRemove: () => void;
  onAltChange: (value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="grid gap-4 rounded-md border border-[#D3D1C7] bg-white p-4 md:grid-cols-[auto_80px_minmax(0,1fr)_minmax(0,1fr)_120px_auto] md:items-center shadow-sm">
      <button
        type="button"
        aria-label="Drag image"
        className="inline-flex size-9 items-center justify-center rounded-md border border-[#D3D1C7] text-[#888780] hover:bg-[#F1EFE8]"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="relative size-20 overflow-hidden rounded-md border border-[#D3D1C7] bg-[#F1EFE8]">
        {image.url ? (
          <Image src={image.url} alt={image.altText || ""} fill className="object-cover" sizes="80px" />
        ) : image.isUploading ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
            <Loader2 className="size-5 animate-spin text-[#185FA5]" />
            <span className="text-[10px] font-bold text-[#185FA5]">{image.progress}%</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Upload className="size-6 text-[#888780]" />
          </div>
        )}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`url-${image.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">URL</label>
        <input
          id={`url-${image.id}`}
          value={image.url}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Image URL"
          className="h-9 rounded-md border border-[#D3D1C7] bg-[#F1EFE8] px-3 text-sm text-[#2C2C2A] outline-none focus:border-[#185FA5] transition-colors"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`alt-${image.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">Alt Text (SEO)</label>
        <input
          id={`alt-${image.id}`}
          value={image.altText || ""}
          onChange={(event) => onAltChange(event.target.value)}
          placeholder="SEO description"
          className="h-9 rounded-md border border-[#D3D1C7] bg-[#F1EFE8] px-3 text-sm text-[#2C2C2A] outline-none focus:border-[#185FA5] transition-colors"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#2C2C2A]">
        <input 
          type="radio" 
          checked={image.isPrimary} 
          onChange={onPrimary} 
          className="size-4 accent-[#185FA5]" 
        />
        Primary
      </label>

      <button
        type="button"
        aria-label="Remove image"
        onClick={onRemove}
        className="inline-flex size-9 items-center justify-center rounded-md border border-red-100 text-[#E24B4A] hover:bg-red-50 transition-colors"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function ProductFormPage({ productId }: ProductFormPageProps) {
  const router = useRouter();
  const isEditing = Boolean(productId);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, any, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      description: "",
      isActive: true,
      images: [],
      variants: [],
    },
    mode: "onChange"
  });

  const { append: appendImage, remove: removeImage, move: moveImage, update: updateImage } = useFieldArray({
    control,
    name: "images",
    keyName: "_key"
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant, update: updateVariant } = useFieldArray({
    control,
    name: "variants",
    keyName: "_key"
  });

  const images = watch("images");
  const variants = watch("variants");
  const categoryId = watch("categoryId");

  const [selectedCategoryFields, setSelectedCategoryFields] = useState<string[]>([]);
  const [prevCategoryId, setPrevCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const category = categories.find(c => c.id === categoryId);
    const fields = category?.variantFields && category.variantFields.length > 0 
      ? category.variantFields 
      : ["Name"];
    
    setSelectedCategoryFields(fields);

    // If category changed manually (not initial load), reset variants
    if (prevCategoryId && prevCategoryId !== categoryId && categories.length > 0) {
      setValue("variants", [emptyVariant(fields)]);
    }
    setPrevCategoryId(categoryId);
  }, [categoryId, categories]);

  // Helper to parse name into field values for existing products
  const parseName = (name: string, fields: string[]) => {
    const values: Record<string, string> = {};
    const parts = name.split(" / ");
    fields.forEach((f, i) => {
      values[f] = parts[i] || "";
    });
    return values;
  };

  useEffect(() => {
    async function load() {
      try {
        const { data: categoriesData } = await axios.get("/api/admin/categories", {
          params: { page: 1, limit: 100 },
        });
        setCategories(categoriesData.categories ?? []);
        const defaultCatId = categoriesData.categories?.[0]?.id || "";
        
        if (!productId) {
          setValue("categoryId", defaultCatId);
          setIsLoading(false);
          return;
        }

        const { data } = await axios.get<{ product: AdminProduct }>(`/api/admin/products/${productId}`);
        const product = data.product;
        setValue("name", product.name);
        setValue("description", product.description || "");
        setValue("categoryId", product.categoryId);
        setValue("isActive", product.isActive);
        setValue("images", product.images.map(img => ({ ...img })));
        
        const currentCategory = categoriesData.categories?.find((c: AdminCategory) => c.id === product.categoryId);
        const currentFields = currentCategory?.variantFields && currentCategory.variantFields.length > 0 
          ? currentCategory.variantFields 
          : ["Name"];

        setValue("variants", product.variants.map(variant => ({ 
          ...variant, 
          fieldValues: parseName(variant.name, currentFields),
          skuError: undefined 
        })));
      } catch (err) {
         toast.error("Error loading product data.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [productId, router, setValue, categories.length]);

  function handleImageChange(index: number, url: string) {
    updateImage(index, { ...images[index], url });
  }

  function handleAltChange(index: number, altText: string) {
    updateImage(index, { ...images[index], altText });
  }

  async function handleRemoveImage(index: number) {
    const image = images[index];
    if (image.publicId) {
      try {
        await axios.delete(`/api/admin/upload-image?publicId=${image.publicId}`);
      } catch (err) {
        console.error("Failed to delete image from Cloudinary:", err);
      }
    }
    removeImage(index);
    // ensure one is primary if there are any left
    setTimeout(() => {
      const current = watch("images");
      if (current.length > 0 && !current.some(img => img.isPrimary)) {
        setValue("images", current.map((img, i) => ({ ...img, isPrimary: i === 0 })));
      }
    }, 0);
  }

  async function handleFilesUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `new_${crypto.randomUUID()}`;
      
      // Append temporary "uploading" row
      appendImage({
        id,
        url: "",
        publicId: null,
        altText: file.name.split('.')[0],
        isPrimary: images.length === 0 && i === 0,
        sortOrder: images.length + i,
        isUploading: true,
        progress: 0
      });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const { data } = await axios.post("/api/admin/upload-image", formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            // Find current index of this temp row
            const currentImages = watch("images");
            const index = currentImages.findIndex(img => img.id === id);
            if (index !== -1) {
              updateImage(index, { ...currentImages[index], progress });
            }
          }
        });

        // Update with final data
        const currentImages = watch("images");
        const index = currentImages.findIndex(img => img.id === id);
        if (index !== -1) {
          updateImage(index, { 
            ...currentImages[index], 
            url: data.url, 
            publicId: data.publicId, 
            isUploading: false,
            progress: 100
          });
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
        const currentImages = watch("images");
        const index = currentImages.findIndex(img => img.id === id);
        if (index !== -1) removeImage(index);
      }
    }
    // Clear input
    event.target.value = "";
  }

  async function validateSku(index: number) {
    const variant = variants[index];
    if (!variant.sku.trim()) {
      updateVariant(index, { ...variant, skuError: "SKU is required." });
      return;
    }

    const duplicateInForm = variants.some(
      (item, i) => i !== index && item.sku.trim().toLowerCase() === variant.sku.trim().toLowerCase()
    );

    if (duplicateInForm) {
      updateVariant(index, { ...variant, skuError: "SKU is already used in this form." });
      return;
    }

    try {
      const { data } = await axios.get("/api/admin/products/sku", {
        params: { sku: variant.sku, excludeVariantId: variant.id },
      });
      updateVariant(index, { ...variant, skuError: data.unique ? undefined : "SKU already exists." });
    } catch(e) {
      // ignore
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = images.findIndex((image) => image.id === active.id);
    const newIndex = images.findIndex((image) => image.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
       moveImage(oldIndex, newIndex);
       setTimeout(() => {
         const current = watch("images");
         setValue("images", current.map((img, i) => ({ ...img, sortOrder: i })));
       }, 0);
    }
  }

  async function onSubmit(data: ProductFormInput) {
    if (data.variants.some(v => v.skuError)) {
      toast.error("Please fix SKU errors before saving.");
      return;
    }

    const preparedVariants = data.variants.map(v => {
      const name = v.fieldValues 
        ? selectedCategoryFields.map(f => v.fieldValues?.[f] || "").join(" / ")
        : v.name;
        
      return {
        id: v.id.startsWith("new_") ? undefined : v.id,
        name: name || "Default",
        price: Number(v.price),
        stock: Number(v.stock),
        sku: v.sku.trim(),
      };
    });

    const payload = {
      name: data.name.trim(),
      description: data.description,
      categoryId: data.categoryId,
      isActive: data.isActive,
      images: data.images.map((image, index) => ({
        id: image.id.startsWith("new_") ? undefined : image.id,
        url: image.url,
        publicId: image.publicId,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: index,
      })),
      variants: preparedVariants,
    };

    try {
      if (isEditing) {
        await axios.patch(`/api/admin/products/${productId}`, payload);
        toast.success("Product updated successfully!");
      } else {
        await axios.post("/api/admin/products", payload);
        toast.success("Product created successfully!");
      }
      router.push("/admin/products");
    } catch (err) {
      toast.error("An error occurred while saving the product.");
    }
  }

  function handleSetPrimaryImage(index: number) {
    const newImages = images.map((img, i) => ({ ...img, isPrimary: i === index }));
    setValue("images", newImages);
  }

  if (isLoading) return null;

  return (
    <form className="grid gap-8 pb-20" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2C2C2A]">
            {isEditing ? "Edit Product" : "Create Product"}
          </h1>
          <p className="mt-1.5 text-sm text-[#888780]">Manage product details, high-quality imagery, and variants.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[#D3D1C7] bg-white px-5 text-sm font-semibold text-[#2C2C2A] hover:bg-[#F1EFE8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#185FA5] px-6 text-sm font-bold text-white hover:bg-[#124d86] disabled:opacity-60 transition-all shadow-md active:scale-[0.98]"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSubmitting ? "Saving changes..." : "Save Product"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-8">
          {/* General Information */}
          <section className="grid gap-6 rounded-xl border border-[#D3D1C7] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#2C2C2A]">
              <Package className="size-5 text-[#185FA5]" />
              <h2 className="text-lg font-bold">General Information</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="product-name" className="text-[10px] font-bold uppercase tracking-widest text-[#888780]">Product Title</label>
                <input
                  id="product-name"
                  {...register("name")}
                  placeholder="e.g. Premium Cotton T-Shirt"
                  className="h-11 rounded-lg border border-[#D3D1C7] bg-[#F1EFE8] px-4 text-sm font-medium text-[#2C2C2A] outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition-all"
                />
                {errors.name && <span className="text-xs font-bold text-[#E24B4A]">{errors.name.message}</span>}
              </div>

              <div className="grid gap-2">
                <label htmlFor="product-category" className="text-[10px] font-bold uppercase tracking-widest text-[#888780]">Category</label>
                <select
                  id="product-category"
                  {...register("categoryId")}
                  className="h-11 rounded-lg border border-[#D3D1C7] bg-[#F1EFE8] px-4 text-sm font-medium text-[#2C2C2A] outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition-all cursor-pointer"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <span className="text-xs font-bold text-[#E24B4A]">{errors.categoryId.message}</span>}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="product-description" className="text-[10px] font-bold uppercase tracking-widest text-[#888780]">Description</label>
              <textarea
                id="product-description"
                {...register("description")}
                rows={5}
                placeholder="Describe the product features, materials, and benefits..."
                className="rounded-lg border border-[#D3D1C7] bg-[#F1EFE8] px-4 py-3 text-sm font-medium text-[#2C2C2A] outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition-all resize-none"
              />
            </div>
          </section>

          {/* Imagery Section */}
          <section className="grid gap-6 rounded-xl border border-[#D3D1C7] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[#2C2C2A]">
                <Plus className="size-5 text-[#185FA5]" />
                <h2 className="text-lg font-bold">Product Imagery</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFilesUpload}
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#185FA5] px-4 text-xs font-bold text-white hover:bg-[#124d86] transition-colors shadow-sm"
                >
                  <Upload className="size-3.5" />
                  Upload Files
                </label>
                <button
                  type="button"
                  onClick={() => appendImage({ ...emptyImage(), isPrimary: images.length === 0, sortOrder: images.length })}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-[#D3D1C7] bg-white px-4 text-xs font-bold text-[#2C2C2A] hover:bg-[#F1EFE8] transition-colors"
                >
                  <Plus className="size-3.5" />
                  Add URL
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-[#D3D1C7] bg-[#F1EFE8]/50 p-4">
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-4">
                    {images.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-[#888780]">
                        <Upload className="mb-2 size-10 opacity-20" />
                        <p className="text-sm font-medium">No images uploaded yet.</p>
                        <p className="text-xs">Upload files or add URLs to showcase your product.</p>
                      </div>
                    ) : (
                      images.map((image: any, index: number) => (
                        <SortableImageRow
                          key={image.id}
                          image={image}
                          onChange={(url) => handleImageChange(index, url)}
                          onAltChange={(alt) => handleAltChange(index, alt)}
                          onPrimary={() => handleSetPrimaryImage(index)}
                          onRemove={() => handleRemoveImage(index)}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <p className="text-[11px] text-[#888780]">
              <span className="font-bold text-[#185FA5]">Tip:</span> Drag and drop images to reorder them. The first image is typically shown in search results.
            </p>
          </section>

          {/* Variants Section */}
          <section className="grid gap-6 rounded-xl border border-[#D3D1C7] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#2C2C2A]">
                <Boxes className="size-5 text-[#185FA5]" />
                <h2 className="text-lg font-bold">Product Variants</h2>
              </div>
              <button
                type="button"
                onClick={() => appendVariant(emptyVariant(selectedCategoryFields))}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#185FA5] px-4 text-xs font-bold text-white hover:bg-[#124d86] transition-colors shadow-sm"
              >
                <Plus className="size-3.5" />
                Add Variant
              </button>
            </div>
            
            <p className="text-sm text-[#888780]">
              Configure different options like size, color, or material. Each variant has its own price, stock, and SKU.
            </p>

            <div className="overflow-x-auto rounded-lg border border-[#D3D1C7]">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#D3D1C7] bg-[#F1EFE8]">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Details</th>
                    <th className="w-32 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Price</th>
                    <th className="w-28 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Stock</th>
                    <th className="w-48 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#888780]">SKU</th>
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D3D1C7]">
                  {variantFields.map((field, index) => (
                    <tr key={field._key} className="bg-white hover:bg-[#F1EFE8]/30 transition-colors">
                      <td className="p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {selectedCategoryFields.map((f) => (
                            <div key={f} className="grid gap-1">
                              <span className="text-[10px] font-bold text-[#888780]">{f}</span>
                              <input
                                {...register(`variants.${index}.fieldValues.${f}`)}
                                placeholder={`Enter ${f.toLowerCase()}`}
                                className="h-9 rounded-md border border-[#D3D1C7] bg-[#F1EFE8] px-3 text-xs font-medium text-[#2C2C2A] outline-none focus:border-[#185FA5]"
                              />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888780] font-bold">₹</span>
                          <input
                            type="number"
                            {...register(`variants.${index}.price`, { valueAsNumber: true })}
                            className="h-10 w-full rounded-md border border-[#D3D1C7] bg-[#F1EFE8] pl-7 pr-3 text-sm font-bold text-[#2C2C2A] outline-none focus:border-[#185FA5]"
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          {...register(`variants.${index}.stock`, { valueAsNumber: true })}
                          className="h-10 w-full rounded-md border border-[#D3D1C7] bg-[#F1EFE8] px-3 text-sm font-bold text-[#2C2C2A] outline-none focus:border-[#185FA5]"
                        />
                      </td>
                      <td className="p-4">
                        <div className="grid gap-1">
                          <input
                            {...register(`variants.${index}.sku`)}
                            onBlur={() => validateSku(index)}
                            className={`h-10 w-full rounded-md border px-3 text-xs font-mono font-bold outline-none transition-all ${
                              variants[index].skuError 
                                ? "border-[#E24B4A] bg-red-50 text-[#E24B4A]" 
                                : "border-[#D3D1C7] bg-[#F1EFE8] text-[#2C2C2A] focus:border-[#185FA5]"
                            }`}
                          />
                          {variants[index].skuError && (
                            <span className="text-[10px] font-bold text-[#E24B4A]">{variants[index].skuError}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="inline-flex size-9 items-center justify-center rounded-md text-[#E24B4A] hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid h-fit gap-8">
          {/* Status Sidebar */}
          <section className="grid gap-6 rounded-xl border border-[#D3D1C7] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#888780]">Visibility & Status</h2>
            <div className="flex items-center justify-between rounded-lg border border-[#D3D1C7] bg-[#F1EFE8] p-4">
              <div className="grid gap-0.5">
                <span className="text-sm font-bold text-[#2C2C2A]">Active Status</span>
                <span className="text-xs text-[#888780]">Visible on store front</span>
              </div>
              <input
                type="checkbox"
                {...register("isActive")}
                className="size-6 cursor-pointer accent-[#185FA5]"
              />
            </div>
            
            <div className="grid gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#888780]">Product ID</span>
              <div className="flex h-11 items-center rounded-lg border border-[#D3D1C7] bg-[#F1EFE8] px-4 text-xs font-mono font-bold text-[#2C2C2A] opacity-60">
                {productId || "Auto-generated"}
              </div>
            </div>
          </section>

          {/* Quick Help */}
          <section className="grid gap-4 rounded-xl border border-[#D3D1C7] bg-[#185FA5]/5 p-6 border-l-4 border-l-[#185FA5]">
            <h3 className="text-sm font-bold text-[#185FA5]">Organization Tip</h3>
            <p className="text-xs leading-relaxed text-[#2C2C2A]">
              Choose the correct category to unlock specific variant fields like <span className="font-bold">Size</span> or <span className="font-bold">Color</span>.
            </p>
          </section>
        </div>
      </div>
    </form>
  );
}
