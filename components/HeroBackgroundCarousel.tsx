"use client";

import Image from "next/image";
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
      {slides.map((slide, index) => {
        const isActive = index === active;
        const opacityClass = isActive ? "opacity-100" : "opacity-0";
        // Solo la PRIMERA imagen es el candidato a LCP: se renderiza con
        // next/image (descubrible en el HTML + priority/fetchpriority=high para
        // que el navegador la baje primero). El resto del carrusel queda como
        // background-image y carga después de la primera pintura, así no se
        // bajan todas las imágenes grandes de golpe en mobile.
        if (index === 0) {
          return (
            <div
              key={`${slide.url}-${index}`}
              className={`absolute inset-0 animate-slow-zoom transition-opacity duration-1000 ease-out ${opacityClass}`}
            >
              <Image
                src={slide.url}
                alt={slide.alt}
                fill
                priority
                fetchPriority="high"
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          );
        }
        return (
          <div
            key={`${slide.url}-${index}`}
            className={`absolute inset-0 animate-slow-zoom bg-cover bg-center transition-opacity duration-1000 ease-out ${opacityClass}`}
            style={{ backgroundImage: `url('${slide.url}')` }}
          />
        );
      })}
    </div>
  );
}
