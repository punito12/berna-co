"use client";

import { useState } from "react";

// Detail-page photo gallery: one large image plus selectable thumbnails.
// Missing files render as cream placeholders (same approach as the cards),
// so an incomplete photo set never shows broken images.
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

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-cream">
        <div
          key={active}
          className="absolute inset-0 animate-fade-up bg-cover bg-center"
          style={{ backgroundImage: `url('${photos[active]}')` }}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center font-black uppercase tracking-tight text-2xl text-line">
          {name}
        </span>

        {isNew && (
          <span className="absolute left-4 top-4 bg-ink px-3 py-1 font-bold uppercase tracking-widest text-xs text-white">
            New
          </span>
        )}
        <span className="absolute right-4 top-4 bg-white/90 px-3 py-1 font-bold uppercase tracking-widest text-xs text-ink backdrop-blur-sm">
          {category}
        </span>
      </div>

      {/* Thumbnails — only when there is more than one photo */}
      {photos.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {photos.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={i === active}
              className={`relative aspect-square overflow-hidden rounded-md border bg-cream transition-all ${
                i === active
                  ? "border-ink ring-2 ring-ink"
                  : "border-line hover:border-ink/40"
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${src}')` }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
