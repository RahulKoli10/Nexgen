"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { Pagination } from "./ui/pagination";
import { PAGE_SIZE } from "./constants";

type StockRow = {
  variantId: string;
  productName: string;
  variantName: string;
  stock: number;
};

export function BulkStockPage() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [total, setTotal] = useState(0);

  async function loadRows() {
    const { data } = await axios.get("/api/admin/products/bulk-stock", {
      params: { page, limit: PAGE_SIZE },
    });
    const nextRows = data.variants ?? [];
    setRows(nextRows);
    setTotal(data.total ?? 0);
    setDrafts(
      Object.fromEntries(nextRows.map((row: StockRow) => [row.variantId, row.stock]))
    );
  }

  
  useEffect(() => {
    setPage(Math.max(1, Number(searchParams.get("page") ?? 1)));
  }, [searchParams]);

  
  useEffect(() => {
    let isMounted = true;

    axios.get("/api/admin/products/bulk-stock", {
      params: { page, limit: PAGE_SIZE },
    })
      .then(({ data }) => {
        if (!isMounted) return;
        const nextRows = data.variants ?? [];
        setRows(nextRows);
        setTotal(data.total ?? 0);
        setDrafts(Object.fromEntries(nextRows.map((row: StockRow) => [row.variantId, row.stock])));
      });

    return () => {
      isMounted = false;
    };
  }, [page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const changedRows = useMemo(
    () => rows.filter((row) => Number(drafts[row.variantId]) !== row.stock),
    [drafts, rows]
  );

  async function saveChanges() {
    setSaving(true);
    try {
      await axios.patch("/api/admin/products/bulk-stock", {
        updates: changedRows.map((row) => ({
          variantId: row.variantId,
          stock: Number(drafts[row.variantId]),
        })),
      });
      toast.success("Stock updated.");
      await loadRows();
    } catch {
      toast.error("Unable to update stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Bulk Stock Update</h1>
        <p className="mt-1 text-sm text-slate-500">Edit variant inventory inline and save in one request.</p>
      </div>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Product name</th>
                <th className="px-5 py-3">Variant name</th>
                <th className="px-5 py-3">Current stock</th>
                <th className="px-5 py-3">New stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.variantId}>
                  <td className="px-5 py-4 font-medium text-slate-950">{row.productName}</td>
                  <td className="px-5 py-4 text-slate-600">{row.variantName}</td>
                  <td className="px-5 py-4 text-slate-600">{row.stock}</td>
                  <td className="px-5 py-4">
                    <input
                      type="number"
                      min="0"
                      value={drafts[row.variantId] ?? 0}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [row.variantId]: Number(event.target.value) }))
                      }
                      className="h-10 w-32 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">{changedRows.length} pending changes</p>
          <div className="flex items-center gap-3">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            <button
              type="button"
              disabled={saving || changedRows.length === 0}
              onClick={saveChanges}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? "Saving..." : "Save all changes"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
