"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Plus, Trash2, Edit2, Loader2, Check, X, AlertCircle } from "lucide-react";
import type { AdminCategory } from "@/components/admin/types";
import toast from "react-hot-toast";
import { SkeletonTable } from "./ui/skeleton-table";
import { EmptyState } from "./ui/empty-state";
import { Pagination } from "./ui/pagination";
import { PAGE_SIZE } from "./constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  variantFields: z.array(z.string()).default(["Name"]),
});

type CategoryFormInput = z.input<typeof categorySchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesListPage() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [total, setTotal] = useState(0);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editVariantFields, setEditVariantFields] = useState<string[]>([]);
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CategoryFormInput, any, CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      variantFields: [],
    },
    mode: "onChange",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  };

  const watchName = watch("name");

  useEffect(() => {
    setValue("slug", generateSlug(watchName), { shouldValidate: true });
  }, [watchName]);

  useEffect(() => {
    setPage(Math.max(1, Number(searchParams.get("page") ?? 1)));
  }, [searchParams]);

  async function loadCategories() {
    try {
      const { data } = await axios.get("/api/admin/categories", {
        params: { page, limit: PAGE_SIZE },
      });
      setCategories(data.categories ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, [page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  async function onSubmit(data: CategoryFormValues) {
    try {
      await axios.post("/api/admin/categories", data);
      toast.success("Category added");
      reset();
      loadCategories();
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to add category";
      if (error.response?.status === 500 && error.response?.data?.error?.includes("Unique constraint")) {
        toast.error("A category with this name/slug already exists.");
      } else {
        toast.error(message);
      }
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }

    const original = categories.find(c => c.id === editingId);
    if (original && original.name === editName && original.slug === editSlug && JSON.stringify(original.variantFields) === JSON.stringify(editVariantFields)) {
      setEditingId(null);
      return;
    }

    try {
      await axios.patch(`/api/admin/categories/${editingId}`, { 
        name: editName, 
        slug: editSlug,
        variantFields: editVariantFields 
      });
      toast.success("Category updated");
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update category");
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(category: AdminCategory) {
    if (category._count && category._count.products > 0) {
      return; 
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    try {
      await axios.delete(`/api/admin/categories/${category.id}`);
      toast.success("Category deleted");
      loadCategories();
    } catch (error) {
      toast.error("Network error");
    }
  }

  const startEditing = (category: AdminCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditVariantFields(category.variantFields || []);
  };

  const VariantFieldManager = ({ 
    fields, 
    onChange, 
    label = "Variant Fields" 
  }: { 
    fields: string[], 
    onChange: (fields: string[]) => void,
    label?: string 
  }) => {
    const [inputValue, setInputValue] = useState("");

    const addField = () => {
      const val = inputValue.trim();
      if (val && !fields.includes(val)) {
        onChange([...fields, val]);
        setInputValue("");
      }
    };

    const removeField = (field: string) => {
      onChange(fields.filter(f => f !== field));
    };

    return (
      <div className="grid gap-1.5 w-full">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
        <div className="flex flex-wrap gap-2 p-2 min-h-[40px] rounded-lg border border-slate-200 bg-slate-50/30">
          {fields.map(field => (
            <span key={field} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium group">
              {field}
              <button 
                type="button" 
                onClick={() => removeField(field)}
                className="hover:text-blue-900 transition"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addField();
              }
            }}
            placeholder="Type and press Enter..."
            className="flex-1 bg-transparent outline-none text-xs min-w-[120px]"
          />
        </div>
        <p className="text-[10px] text-slate-400 italic">Press Enter to add fields like "Size", "Color", etc.</p>
      </div>
    );
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Categories</h1>
        <p className="mt-1 text-sm text-slate-500">Organize your products into logical groups.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-start gap-4">
          <div className="grid flex-1 min-w-[200px] gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</label>
            <input
              {...register("name", {
                onChange: (e) => {
                  setValue("slug", generateSlug(e.target.value), { shouldValidate: true });
                }
              })}
              placeholder="e.g. Mechanical Keyboards"
              className={["h-10 rounded-lg border px-3 text-sm outline-none transition focus:ring-4 focus:ring-blue-500/10", errors.name ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-blue-500"].join(" ")}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>
          <div className="grid flex-1 min-w-[200px] gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Slug</label>
            <input
              {...register("slug")}
              placeholder="mechanical-keyboards"
              className={["h-10 rounded-lg border bg-slate-50 px-3 text-sm outline-none transition focus:ring-4 focus:ring-blue-500/10", errors.slug ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-blue-500"].join(" ")}
            />
            {errors.slug && <span className="text-xs text-red-500">{errors.slug.message}</span>}
          </div>

          <div className="w-full md:w-[300px]">
            <VariantFieldManager 
              fields={watch("variantFields") ?? []} 
              onChange={(fields) => setValue("variantFields", fields, { shouldValidate: true })} 
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 active:scale-[0.98] mt-[22px]"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add Category
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Variant Fields</th>
                <th className="px-6 py-4 text-center">Products</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr className="!bg-transparent hover:!bg-transparent">
                    <td colSpan={4} className="p-0">
                      <SkeletonTable columns={4} rows={3} />
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr className="!bg-transparent hover:!bg-transparent">
                    <td colSpan={4} className="p-0">
                      <EmptyState 
                        title="No categories found"
                        description="You don't have any categories yet. Create one above to get started."
                      />
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                  <tr key={category.id} className="group hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      {editingId === category.id ? (
                        <input
                          ref={editInputRef}
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditSlug(generateSlug(e.target.value));
                          }}
                          onBlur={handleSaveEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-8 w-full rounded border border-blue-500 px-2 text-sm outline-none shadow-sm"
                        />
                      ) : (
                        <div 
                          onClick={() => startEditing(category)}
                          className="flex items-center gap-2 font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition"
                        >
                          {category.name}
                          <Edit2 className="size-3 opacity-0 group-hover:opacity-100 transition text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{category.slug}</td>
                    <td className="px-6 py-4">
                      {editingId === category.id ? (
                        <VariantFieldManager 
                          fields={editVariantFields}
                          onChange={setEditVariantFields}
                          label=""
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {category.variantFields && category.variantFields.length > 0 ? (
                            category.variantFields.map(f => (
                              <span key={f} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase tracking-wider font-semibold">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Default (Name)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">
                      {(category as AdminCategory & { _count?: { products?: number } })._count?.products ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {category._count && category._count.products > 0 ? (
                          <div className="group/tip relative">
                            <button
                              disabled
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-100 text-slate-300 cursor-not-allowed"
                            >
                              <Trash2 className="size-4" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tip:block w-48 rounded-lg bg-slate-900 p-2 text-[10px] text-white shadow-xl">
                              <div className="flex gap-1.5">
                                <AlertCircle className="size-3 shrink-0" />
                                Remove all products from this category before deleting.
                              </div>
                              <div className="absolute -bottom-1 right-3 size-2 rotate-45 bg-slate-900" />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(category)}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-100 transition"
                            title="Delete Category"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-6 py-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>
    </div>
  );
}
