import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { ProductDetailView } from "@/components/product/product-detail-view";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ;
  const res = await fetch(`${baseUrl}/api/product/slug/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }
  const data = await res.json();
  const product = data?.data;
  if (!product) {
    notFound();
  }

  const recommendationsRes = await fetch(`${baseUrl}/api/product?view=card`, {
    cache: "no-store",
  });
  const recommendationsData = recommendationsRes.ok
    ? await recommendationsRes.json()
    : null;
  const productCategory =
    typeof product.category === "object" && product.category !== null
      ? product.category.name
      : product.category;
  const recommendedProducts = Array.isArray(recommendationsData?.data)
    ? recommendationsData.data
        .filter((recommendedProduct: { slug?: string }) => recommendedProduct.slug !== slug)
        .sort((a: { category?: string; tag?: string }, b: { category?: string; tag?: string }) => {
          const aMatches = a.category === productCategory || a.tag === productCategory;
          const bMatches = b.category === productCategory || b.tag === productCategory;
          if (aMatches === bMatches) return 0;
          return aMatches ? -1 : 1;
        })
        .slice(0, 4)
    : [];

  return (
    <>
      <SiteHeader />
      <ProductDetailView product={product}  />
      <SiteFooter />
    </>
  );
}