"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const changePage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`?${params.toString()}`, { scroll: false });
    onPageChange(nextPage);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first, last, current, and adjacent
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return pages.map((page, index) => {
      if (page === "...") {
        return (
          <span key={`dots-${index}`} className="flex items-center justify-center px-3 py-2 text-[#5F5E5A]">
            <MoreHorizontal className="size-4" />
          </span>
        );
      }

      const isCurrentPage = page === currentPage;
      
      return (
        <button
          key={`page-${page}`}
          onClick={() => changePage(page as number)}
          className={`flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors
            ${isCurrentPage 
              ? "bg-[#185FA5] text-white" 
              : "border border-[#D3D1C7] bg-white text-[#2C2C2A] hover:bg-[#F1EFE8]"
            }`}
          aria-current={isCurrentPage ? "page" : undefined}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <nav className="flex items-center justify-center gap-1 sm:justify-between" aria-label="Pagination">
      <div className="hidden text-sm text-[#5F5E5A] sm:block">
        Page <span className="font-medium text-[#2C2C2A]">{currentPage}</span> of{" "}
        <span className="font-medium text-[#2C2C2A]">{totalPages}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 rounded-md border border-[#D3D1C7] bg-white px-3 py-2 text-sm font-medium text-[#2C2C2A] transition hover:bg-[#F1EFE8] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>
        
        <div className="flex items-center gap-1">
          {renderPageNumbers()}
        </div>

        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 rounded-md border border-[#D3D1C7] bg-white px-3 py-2 text-sm font-medium text-[#2C2C2A] transition hover:bg-[#F1EFE8] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
