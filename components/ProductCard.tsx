"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  formatWeight,
  priceFor,
  promoPriceFor,
  promoPercentFor,
  promoTypeFor,
  stockFor,
  isProductOutOfStock,
  type ProductForUI,
} from "@/lib/products";

export default function ProductCard({ product }: { product: ProductForUI }) {
  const { addToCart } = useCart();

  // Local UI state only: which empanado the customer picked. Defaults to first.
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );
  const [justAdded, setJustAdded] = useState(false);

  // Cover photo follows the chosen empanado (each variant has its own photos).
  // Falls back to the product's default cover if that variant has none.
  const cover = product.imagesByBreadcrumb[selected]?.[0] ?? product.imageUrl;

  // Stock is per empanado: the selected one may be out while others aren't.
  const selectedOutOfStock = stockFor(product, selected) <= 0;
  // The whole product is out only when every empanado is at 0.
  const allOutOfStock = isProductOutOfStock(product);

  // Promos for the selected empanado.
  const selPromoPercent = promoPercentFor(product, selected);
  const selPromoType = promoTypeFor(product, selected);

  function handleAdd() {
    if (selectedOutOfStock) return;
    addToCart(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-xl">
      {/* Photo → product detail. Missing files simply show the cream block
          underneath — no broken-image icon. Drop the .jpg into
          /public/images/productos/. */}
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-[2/3] w-full overflow-hidden bg-cream"
        aria-label={`Ver ${product.name}`}
      >
        {/* Placeholder name sits BEHIND the photo (-z-10). Only visible when
            the image file is missing (the photo layer is then transparent).
            The frame matches the photos' 2:3 ratio so nothing gets cropped. */}
        <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center px-6 text-center font-black uppercase tracking-tight text-line">
          {product.name}
        </span>
        <div
          key={cover}
          className={`absolute inset-0 bg-contain bg-top bg-no-repeat transition-transform duration-700 ease-out ${
            allOutOfStock ? "opacity-40 grayscale" : "group-hover:scale-105"
          }`}
          style={{ backgroundImage: `url('${cover}')` }}
        />

        {/* Top-left badges: promos stand out the most (red), then New / stock. */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!allOutOfStock && selPromoType && (
            <span className="bg-[#c0392b] px-3 py-1.5 font-black uppercase tracking-widest text-sm text-white shadow-md">
              {selPromoType}
            </span>
          )}
          {!allOutOfStock && selPromoPercent > 0 && (
            <span className="bg-[#c0392b] px-3 py-1.5 font-black uppercase tracking-widest text-sm text-white shadow-md">
              -{selPromoPercent}%
            </span>
          )}
          {product.isNew && !allOutOfStock && (
            <span className="bg-ink px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-white">
              New
            </span>
          )}
          {allOutOfStock && (
            <span className="bg-ink px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-white">
              Sin stock
            </span>
          )}
        </div>

        <span className="absolute right-3 top-3 bg-white/90 px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-ink backdrop-blur-sm">
          {product.category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="font-bold uppercase tracking-tight text-lg text-ink transition-colors hover:text-muted">
            {product.name}
          </h3>
        </Link>
        <p className="mt-0.5 font-bold uppercase tracking-wide text-xs text-muted">
          {formatWeight(product.weightGrams)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {product.description}
        </p>

        <Link
          href={`/producto/${product.slug}`}
          className="mt-2 inline-block font-bold uppercase tracking-widest text-[11px] text-ink underline-offset-4 hover:underline"
        >
          Ver detalle y fotos →
        </Link>

        {/* Empanado selector (pills) */}
        <div className="mt-4">
          <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
            Empanado
          </p>
          <div className="flex flex-wrap gap-2">
            {product.breadcrumbs.map((code) => {
              const active = code === selected;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelected(code)}
                  aria-pressed={active}
                  className={`rounded-full border border-black px-3 py-1 font-bold uppercase tracking-wide text-xs transition-colors ${
                    active
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-cream"
                  }`}
                >
                  {BREADCRUMB_LABELS[code] ?? code}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price + add button pinned to the bottom of the card. The promo
            badges live over the photo (top-left); here we only show the price,
            with the original struck through when there's a % promo. */}
        <div className="mt-auto pt-5">
          {selPromoPercent > 0 ? (
            <p className="flex items-baseline gap-2">
              <span className="font-black text-2xl text-[#c0392b]">
                {formatPrice(promoPriceFor(product, selected))}
              </span>
              <span className="text-sm text-muted line-through">
                {formatPrice(priceFor(product, selected))}
              </span>
            </p>
          ) : (
            <p className="font-black text-2xl text-black">
              {formatPrice(priceFor(product, selected))}
            </p>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={selectedOutOfStock}
            className="mt-3 w-full overflow-hidden bg-black px-4 py-3 font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:bg-muted"
          >
            {selectedOutOfStock
              ? "Sin stock"
              : justAdded
              ? "Agregado ✓"
              : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
