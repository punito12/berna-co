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
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);

  useEffect(() => {
    setActive(0);
    setFirstImageLoaded(false);
  }, [slides]);

  useEffect(() => {
    if (!firstImageLoaded || slides.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [firstImageLoaded, intervalMs, slides.length]);

  return (
    <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden bg-ink">
      {slides.map((slide, index) => {
        // El HTML inicial contiene solamente el primer slide. Los demás se
        // montan después de que el LCP terminó de cargar, evitando que varios
        // JPG remotos compitan por ancho de banda en mobile.
        if (index > 0 && !firstImageLoaded) return null;
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
                sizes="(max-width: 640px) 80vw, 100vw"
                // Va detrás de un overlay negro al 65%, así que una calidad un
                // poco más baja no se nota y baja bytes del LCP.
                quality={60}
                onLoad={() => setFirstImageLoaded(true)}
                onError={() => setFirstImageLoaded(true)}
                className="object-cover object-center"
              />
            </div>
          );
        }
        return (
          <div
            key={`${slide.url}-${index}`}
            className={`absolute inset-0 animate-slow-zoom transition-opacity duration-1000 ease-out ${opacityClass}`}
          >
            <Image
              src={slide.url}
              alt={slide.alt}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 80vw, 100vw"
              quality={60}
              className="object-cover object-center"
            />
          </div>
        );
      })}
    </div>
  );
}
