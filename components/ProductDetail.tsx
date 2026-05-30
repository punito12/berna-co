"use client";

import { useState } from "react";
import ProductGallery from "@/components/ProductGallery";
import AddToCartPanel from "@/components/AddToCartPanel";
import { formatWeight, type ProductForUI } from "@/lib/products";

// Two-column product detail. Holds the selected empanado so the gallery (left)
// and the buy controls (right) stay in sync: choosing a breadcrumb swaps the
// photos to that variant's packaging.
export default function ProductDetail({ product }: { product: ProductForUI }) {
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );

  const images = product.imagesByBreadcrumb[selected] ?? [];

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      {/* Gallery — `key` resets the active thumbnail when the empanado changes */}
      <ProductGallery
        key={selected}
        images={images}
        name={product.name}
        isNew={product.isNew}
        category={product.category}
      />

      {/* Info + buy */}
      <div>
        <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
          {product.category}
        </p>
        <h1 className="mt-2 font-black uppercase tracking-tight text-4xl sm:text-5xl text-ink">
          {product.name}
        </h1>
        <p className="mt-2 font-bold uppercase tracking-wide text-sm text-muted">
          {formatWeight(product.weightGrams)}
        </p>

        <p className="mt-6 font-serif text-lg leading-relaxed text-ink/80">
          {product.description}
        </p>

        <AddToCartPanel
          product={product}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}
