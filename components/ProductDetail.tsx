"use client";

import { useState } from "react";
import ProductGallery from "@/components/ProductGallery";
import AddToCartPanel from "@/components/AddToCartPanel";
import RichText from "@/components/RichText";
import {
  BREADCRUMB_LABELS,
  formatWeight,
  type ProductForUI,
} from "@/lib/products";

type ProductDetailLabels = {
  chooseBreadcrumb?: string;
  addToCart?: string;
  outOfStock?: string;
  lowStock?: string;
  addedDetail?: string;
};

// Two-column product detail. Holds the selected empanado so the gallery (left)
// and the buy controls (right) stay in sync: choosing a breadcrumb swaps the
// photos to that variant's packaging.
export default function ProductDetail({
  product,
  labels = {},
}: {
  product: ProductForUI;
  labels?: ProductDetailLabels;
}) {
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );

  const images = product.imagesByBreadcrumb[selected] ?? [];
  const descriptionStyle: React.CSSProperties = {
    fontFamily: "var(--description-font, var(--font-fraunces), serif)",
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:gap-14">
      {/* Gallery — `key` resets the active thumbnail when the empanado changes */}
      <ProductGallery
        key={selected}
        images={images}
        name={product.name}
        isNew={product.isNew}
        category={product.category}
      />

      {/* Info + buy */}
      <div className="lg:pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full border border-line bg-white px-3 py-1 font-bold uppercase tracking-[0.22em] text-[11px] text-muted">
            {product.category}
          </p>
          <p className="rounded-full border border-line bg-white px-3 py-1 font-bold uppercase tracking-wide text-[11px] text-muted">
            {formatWeight(product.weightGrams)}
          </p>
        </div>
        <h1 className="mt-3 max-w-2xl text-balance font-black uppercase tracking-tight text-4xl leading-[0.95] text-ink sm:text-6xl">
          {product.name}
        </h1>

        {/* Universal description (same for the whole cut). Falls back to the
            short one. Rendered with RichText so markdown styles show. La fuente
            (--description-font) va DIRECTO en el contenedor del texto (igual que
            la descripción corta de la card) para que el cambio de fuente del CMS
            aplique sí o sí, sin depender de herencia desde un wrapper externo. */}
        <RichText
          text={product.longDescription?.trim() || product.description}
          style={descriptionStyle}
          className="mt-5 border-y border-line py-5 text-base leading-relaxed text-ink/80 sm:mt-6 sm:py-6 sm:text-lg [&_p]:mt-2 first:[&_p]:mt-0"
        />

        {/* Per-empanado description: swaps when the customer picks a different
            empanado. Only shown when this empanado has its own text. */}
        {product.empanadoDescriptionByBreadcrumb[selected]?.trim() && (
          <div className="mt-4 rounded-lg border border-line bg-cream/40 p-4 sm:p-5">
            <p className="mb-1 font-bold uppercase tracking-wide text-[11px] text-muted">
              {BREADCRUMB_LABELS[selected] ?? selected}
            </p>
            <RichText
              text={product.empanadoDescriptionByBreadcrumb[selected]}
              style={descriptionStyle}
              className="text-base leading-relaxed text-ink/80 sm:text-lg [&_p]:mt-2 first:[&_p]:mt-0"
            />
          </div>
        )}

        <AddToCartPanel
          product={product}
          selected={selected}
          onSelect={setSelected}
          labels={labels}
        />
      </div>
    </div>
  );
}
