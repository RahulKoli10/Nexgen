"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import axios from "axios";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/home/cta-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type SliderImage = {
  id: string;
  url: string;
  alt?: string | null;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
};

export function HeroSlider({ slides: initialSlides }: { slides?: SliderImage[] }) {
  const [slides, setSlides] = useState<SliderImage[]>(initialSlides || []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(!initialSlides);

  useEffect(() => {
    if (!initialSlides) {
      const fetchSlides = async () => {
        try {
          const response = await axios.get("/api/slider");
          setSlides(response.data);
        } catch (error) {
          console.error("Failed to fetch slides:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSlides();
    }
  }, [initialSlides]);

  const goToPrevious = () => {
    if (slides.length <= 1) return;
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? slides.length - 1 : currentIndex - 1,
    );
  };

  const goToNext = () => {
    if (slides.length <= 1) return;
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  const currentSlide = slides[activeIndex];

  if (isLoading) {
    return (
      <section className="hero-shell" id="slider">
        <div className="hero-copy">
          <div className="hero-copy-skeleton" aria-busy="true">
            <Skeleton className="hero-skeleton-eyebrow" />
            <Skeleton className="hero-skeleton-title" />
            <Skeleton className="hero-skeleton-text" />
            <Skeleton className="hero-skeleton-text short" />
            <div className="hero-actions">
              <Skeleton className="hero-skeleton-button" />
              <Skeleton className="hero-skeleton-button light" />
            </div>
          </div>
        </div>
        <div className="slider-shell">
          <div className="slider">
            <div className="slide-link">
              <div className="slide-image-wrap slide-image-only">
                <Skeleton className="hero-skeleton-image" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-shell" id="slider">
      <div className="hero-copy">
        {currentSlide ? (
          <>
            <p className="eyebrow">{currentSlide.subtitle || "New Season"}</p>
            <h2 className="break-all text-5xl" >{currentSlide.title || "Curated style for everyday wear"}</h2>
            <p>{currentSlide.alt || "Discover the latest edit from our homepage collection."}</p>
            <div className="hero-actions">
              <CtaButton asChild>
                <Link className="bg-white" href={currentSlide.linkUrl || '/products'}>
                  {currentSlide.linkUrl ? "Shop Now" : "View All Products"}
                </Link>
              </CtaButton>
              <CtaButton tone="light" asChild>
                <Link href="/#products">View Details</Link>
              </CtaButton>
            </div>
          </>
        ) : (
          <div className="hero-copy-skeleton">
            <p className="text-[#888780]">No active slides available.</p>
          </div>
        )}
      </div>

      <div className="slider-shell">
        <div className="slider" aria-label="Featured clothing banners">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {slides.map((slide, index) => {
              const SlideContent = (
                <div className="slide-image-wrap slide-image-only">
                  <Image
                    src={slide.url}
                    alt={slide.alt || ""}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 900px) 100vw, 50vw"
                    className="slide-image"
                  />
                </div>
              );

              return (
                <div
                  key={slide.id}
                  className="slide-link cursor-pointer"
                  aria-label={slide.alt || `Hero slide ${index + 1}`}
                >
                  {slide.linkUrl ? (
                    <Link href={slide.linkUrl} className="block w-full h-full">
                      {SlideContent}
                    </Link>
                  ) : (
                    SlideContent
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="slider-controls">
          <div className="slider-arrows">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="slider-arrow"
              onClick={goToPrevious}
              disabled={slides.length <= 1}
              aria-label="Previous slide"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="slider-arrow"
              onClick={goToNext}
              disabled={slides.length <= 1}
              aria-label="Next slide"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="slider-dots" aria-label="Choose slide">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={index === activeIndex ? "slider-dot is-active" : "slider-dot"}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-pressed={index === activeIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
