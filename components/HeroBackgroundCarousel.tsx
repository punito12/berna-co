"use client";

import { useEffect, useMemo, useState } from "react";

export type HeroBackgroundImage = {
  url: string;
  alt?: string;
};

export default function HeroBackgroundCarousel({
  images,
  fallbackUrl,
  intervalMs = 5000,
}: {
  images?: HeroBackgroundImage[];
  fallbackUrl: string;
  intervalMs?: number;
}) {
  const slides = useMemo(() => {
    const clean = (images ?? [])
      .map((image) => ({
        url: image.url.trim(),
        alt: image.alt?.trim() ?? "",
      }))
      .filter((image) => image.url.length > 0);
    return clean.length > 0 ? clean : [{ url: fallbackUrl, alt: "" }];
  }, [fallbackUrl, images]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, slides.length]);

  return (
    <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden bg-ink">
      {slides.map((slide, index) => (
        <div
          key={`${slide.url}-${index}`}
          className={`absolute inset-0 animate-slow-zoom bg-cover bg-center transition-opacity duration-1000 ease-out ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url('${slide.url}')` }}
        />
      ))}
    </div>
  );
}
