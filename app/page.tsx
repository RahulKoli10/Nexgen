
import { CategoriesSection } from "@/components/home/categories-section";
import { HeroSlider } from "@/components/home/hero-slider";
import { ProductsSection } from "@/components/home/products-section";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const sliderImages = await prisma.sliderImage.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  }).catch(() => []);

  return (
    <main className="homepage">
      <SiteHeader />
      <HeroSlider
        slides={sliderImages.map((image) => ({
          id: image.id,
          url: image.url,
          alt: image.alt,
          title: image.title,
          subtitle: image.subtitle,
          linkUrl: image.linkUrl,
        }))}
      />
      <CategoriesSection />
      <ProductsSection />
      <SiteFooter />
    </main>
  );
}
