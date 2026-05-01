"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";

import ProductCard from "@/components/home/product-card";
import { SectionHeading } from "@/components/home/section-heading";
import type { ProductItem } from "@/components/home/home-data";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <Card className="product-card product-card-skeleton cursor-pointer py-0 shadow-none transition-shadow duration-300 hover:shadow-lg hover:shadow-gray-400">
      <div className="product-card-topbar">
        <Skeleton className="product-skeleton-pill" />
        <Skeleton className="product-skeleton-icon" />
      </div>
      <Skeleton className="product-skeleton-image" />
      <CardContent className="product-copy px-5 pb-5">
        <div className="product-skeleton-copy">
          <Skeleton className="product-skeleton-title" />
          <Skeleton className="product-skeleton-text" />
          <Skeleton className="product-skeleton-text short" />
        </div>
        <div className="product-meta">
          <Skeleton className="product-skeleton-price" />
          <Skeleton className="product-skeleton-button" />
        </div>
      </CardContent>
    </Card>
  );
}

const fetchFeaturedProducts = async () => {
  const res = await axios.get("/product");

  if (!res.data?.success) {
    throw new Error("Failed to fetch products");
  }

  return res.data.data as ProductItem[];
};

export function ProductsSection() {
  const {
    data: featuredProducts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.featuredProducts,
    queryFn: fetchFeaturedProducts,
  });

  return (
    <section className="section-block" id="products">
      <SectionHeading
        eyebrow="Featured Products"
        title="Pieces designed to mix, layer, and last."
        // note="Neutral shades, breathable textures, and silhouettes that move across workdays, weekends, and evenings."
        split
      />

      {isLoading && (
        <div className="product-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      )}

      {error && <p className="text-red-500">Failed to load products</p>}

      {!isLoading && !error && (
        <div className="product-grid">
          {featuredProducts?.length > 0 ? (
            featuredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))
          ) : (
            <p>No products found</p>
          )}
        </div>
      )}
    </section>
  );
}
