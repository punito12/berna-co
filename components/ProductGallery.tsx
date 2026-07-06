"use client";

import { useRef, useState } from "react";

// Detail-page photo gallery: una foto grande con flechas para pasar (sin
// thumbnails) y puntitos de orientación. Missing files render as cream
// placeholders, so an incomplete photo set never shows broken images.
export default function ProductGallery({
  images,
  name,
  isNew,
  category,
}: {
  images: string[];
  name: string;
  isNew: boolean;
  category: string;
}) {
  // Always have at least one slot so the layout holds before photos exist.
  const photos = images.length > 0 ? images : ["/images/productos/_missing.jpg"];
  const [active, setActive] = useState(0);
  const prev = () =>
    setActive((a) => (a - 1 + photos.length) % photos.length);
  const next = () => setActive((a) => (a + 1) % photos.length);

  // Swipe táctil (mobile): deslizar >40px horizontal cambia de foto.
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null || photos.length < 2) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (Math.abs(delta) > 40) (delta < 0 ? next : prev)();
    touchX.current = null;
  }

  return (
    <div className="lg:sticky lg:top-24" data-cms-section="product.gallery">
      {/* Main image. Mobile: marco en la MISMA proporción que las fotos (2:3),
          más angosto que el texto, y se pasa DESLIZANDO (sin flechas). */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="animate-fade-up relative mx-auto aspect-[2/3] w-4/5 touch-pan-y overflow-hidden rounded-3xl border border-line bg-cream shadow-[0_18px_45px_rgba(10,10,10,0.08)] sm:mx-0 sm:w-full"
      >
        {/* Placeholder name sits BEHIND the photo; only shows if a file is missing. */}
        <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center px-8 text-center font-black uppercase tracking-tight text-2xl text-line">
          {name}
        </span>
        <div
          key={active}
          className="absolute inset-0 animate-fade-up bg-contain bg-center bg-no-repeat sm:bg-top"
          style={{ backgroundImage: `url('${photos[active]}')` }}
        />

        {isNew && (
          <span className="absolute left-4 top-4 rounded-full bg-ink px-4 py-1.5 font-bold uppercase tracking-widest text-xs text-white shadow-[0_8px_25px_rgba(10,10,10,0.25)]">
            New
          </span>
        )}
        <span className="absolute right-4 top-4 rounded-full border border-line bg-white/85 px-4 py-1.5 font-bold uppercase tracking-widest text-xs text-ink shadow-[0_8px_25px_rgba(10,10,10,0.12)] backdrop-blur-xl">
          {category}
        </span>

        {/* Flechas + puntitos internos — solo desktop */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/85 text-xl text-ink shadow-[0_8px_25px_rgba(10,10,10,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95 sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/85 text-xl text-ink shadow-[0_8px_25px_rgba(10,10,10,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95 sm:flex"
            >
              ›
            </button>
            <div
              aria-hidden
              className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 gap-1.5 sm:flex"
            >
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Puntitos DEBAJO de la imagen — solo mobile (invitan a deslizar) */}
      {photos.length > 1 && (
        <div aria-hidden className="mt-3 flex justify-center gap-1.5 sm:hidden">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
