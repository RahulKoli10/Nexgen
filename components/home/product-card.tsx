"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CtaButton } from "@/components/home/cta-button";
import { ProductItem } from "@/components/home/home-data";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { useState } from "react";
import api from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

import { useToast } from "@/components/ui/toast-context";

type ProductCardProps = {
  product: ProductItem;
};

type ProductCardImage = string | {
  url?: string | null;
  altText?: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as { response?: { data?: { error?: unknown } } }
    ).response;

    if (typeof response?.data?.error === "string") {
      return response.data.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { showToast } = useToast();
  const { refreshWishlistCount } = useWishlist();
  const queryClient = useQueryClient();
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const productId = product.id || product.slug;

  const imageUrl = getImageUrl(product);
  const imageAlt = getImageAlt(product);
  const imageLoaded = loadedImageUrl === imageUrl;

  const wishlistStateQuery = useQuery({
    queryKey: queryKeys.product.wishlistState(productId),
    queryFn: async () => {
      const res = await api.get(`/wishlist?productId=${productId}`);
      return Boolean(res.data?.wishlisted);
    },
    enabled: Boolean(productId),
    placeholderData: false,
  });

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch("/wishlist", { productId });
      return res.data as { wishlisted?: boolean; message?: string };
    },
    onSuccess: (data) => {
      const nextWishlisted = Boolean(data.wishlisted);
      queryClient.setQueryData(
        queryKeys.product.wishlistState(productId),
        nextWishlisted
      );
      refreshWishlistCount();
      showToast(
        data.message ||
          (nextWishlisted ? "Added to wishlist!" : "Removed from wishlist"),
        nextWishlisted ? "success" : "info"
      );
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err, "Failed to update wishlist"), "error");
    },
  });

  const handleWishlistClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    wishlistMutation.mutate();
  };

  function getImageUrl(product: ProductItem): string {
    const img = (product.images as ProductCardImage[] | undefined)?.[0];
    if (!img) return "/placeholder.png";
    if (typeof img === "string") return img;
    if (typeof img.url === "string") return img.url;
    return "/placeholder.png";
  }
  function getImageAlt(product: ProductItem): string {
    const img = (product.images as ProductCardImage[] | undefined)?.[0];
    if (!img) return product.name;
    if (typeof img === "string") return product.name;
    if (typeof img.altText === "string" && img.altText) return img.altText;
    return product.name;
  }

  return (
    <Card
      id={product.slug}
      className="product-card cursor-pointer border-[color:var(--border)] bg-[var(--card)] py-0 shadow-none transition-shadow duration-300 hover:shadow-lg hover:shadow-gray-400"
    >
      <div className="product-card-topbar">
        <div className="product-tag">
          <BadgeCheck className="size-3.5" />
          {product.tag || "Premium"}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={`product-wishlist-button${wishlistStateQuery.data ? " is-active" : ""}`}
          aria-label={`${wishlistStateQuery.data ? "Remove" : "Add"} ${product.name} ${wishlistStateQuery.data ? "from" : "to"} wishlist`}
          aria-pressed={wishlistStateQuery.data}
          onClick={handleWishlistClick}
          disabled={wishlistMutation.isPending}
        >
          <Heart className={`size-4${wishlistStateQuery.data ? " fill-current" : ""}`} />
        </Button>
      </div>
      <Link href={`/products/${product.slug}`} className="product-card-link">
        <div className="product-image-wrap">
          {!imageLoaded && (
            <Skeleton className="product-image-skeleton" aria-hidden="true" />
          )}
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className={`product-image${imageLoaded ? " is-loaded" : ""}`}
            onLoad={() => setLoadedImageUrl(imageUrl)}
          />
          {/* <div className="product-image-overlay">
            <span>Open product</span>
            <ArrowUpRight className="size-4" />
          </div> */}
        </div>
        <CardContent className="product-copy px-5 pb-5">
          <div>
            <h3>{product.name}</h3>
            {/* <p>{product.description}</p> */}
          </div>
          <div className="product-meta">
            <strong>{product.price}</strong>
            <CtaButton asChild size="sm" className="product-card-cta">
              <span>
                View <ArrowUpRight className="size-4" />
              </span>
            </CtaButton>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
function refreshWishlistCount() {
  window.dispatchEvent(new CustomEvent('refreshWishlistCount'));
}

