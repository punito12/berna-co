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

export default function ProductCard({
  product,
  efectivoPct = 0,
  transferenciaPct = 0,
  outOfStockLabel = "Sin stock",
  addToCartLabel = "Agregar al carrito",
  chooseBreadcrumbLabel = "Empanado",
  newLabel = "New",
}: {
  product: ProductForUI;
  efectivoPct?: number;
  transferenciaPct?: number;
  outOfStockLabel?: string;
  addToCartLabel?: string;
  chooseBreadcrumbLabel?: string;
  newLabel?: string;
}) {
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
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-[0_1px_0_rgba(10,10,10,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_22px_55px_rgba(10,10,10,0.10)]">
      {/* Photo → product detail. Missing files simply show the cream block
          underneath — no broken-image icon. Drop the .jpg into
          /public/images/productos/. */}
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-cream sm:aspect-[2/3]"
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
            <span className="bg-accent px-3 py-1.5 font-black uppercase tracking-widest text-sm text-white shadow-md">
              {selPromoType}
            </span>
          )}
          {!allOutOfStock && selPromoPercent > 0 && (
            <span className="bg-accent px-3 py-1.5 font-black uppercase tracking-widest text-sm text-white shadow-md">
              -{selPromoPercent}%
            </span>
          )}
          {product.isNew && !allOutOfStock && (
            <span className="bg-ink px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-white">
              {newLabel}
            </span>
          )}
          {allOutOfStock && (
            <span className="bg-ink px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-white">
              {outOfStockLabel}
            </span>
          )}
        </div>

        <span className="absolute right-3 top-3 border border-line/80 bg-white/90 px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-ink backdrop-blur-sm">
          {product.category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-5 md:p-6">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="font-black uppercase tracking-tight text-base leading-tight text-ink transition-colors hover:text-muted sm:text-xl">
            {product.name}
          </h3>
        </Link>
        <p className="mt-0.5 font-bold uppercase tracking-wide text-xs text-muted">
          {formatWeight(product.weightGrams)}
        </p>
        <p className="mt-3 hidden text-sm leading-relaxed text-muted sm:block">
          {product.description}
        </p>

        <Link
          href={`/producto/${product.slug}`}
          className="mt-2 hidden font-bold uppercase tracking-widest text-[11px] text-ink underline-offset-4 hover:underline sm:inline-block"
        >
          Ver detalle y fotos →
        </Link>

        {/* Empanado selector (pills) */}
        <div className="mt-3 sm:mt-4">
          <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
            {chooseBreadcrumbLabel}
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {product.breadcrumbs.map((code) => {
              const active = code === selected;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelected(code)}
                  aria-pressed={active}
                  className={`rounded-full border border-black px-2.5 py-1 font-bold uppercase tracking-wide text-[11px] transition-all duration-200 sm:px-3 sm:py-1.5 sm:text-xs ${
                    active
                      ? "bg-black text-white shadow-sm"
                      : "bg-white text-black hover:-translate-y-0.5 hover:bg-cream"
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
        <div className="mt-auto pt-4 sm:pt-5">
          {selPromoPercent > 0 ? (
            <p className="flex items-baseline gap-2">
              <span className="font-black text-xl text-accent sm:text-2xl">
                {formatPrice(promoPriceFor(product, selected))}
              </span>
              <span className="text-sm text-muted line-through">
                {formatPrice(priceFor(product, selected))}
              </span>
            </p>
          ) : (
            <p className="font-black text-xl text-black sm:text-2xl">
              {formatPrice(priceFor(product, selected))}
            </p>
          )}
          {/* Per-method prices (only when a discount is configured). Base is the
              already-promo'd price. Shown as green pills so they stand out. */}
          {(() => {
            const base =
              selPromoPercent > 0
                ? promoPriceFor(product, selected)
                : priceFor(product, selected);
            const chips: { price: number; label: string }[] = [];
            if (efectivoPct > 0)
              chips.push({
                price: Math.round((base * (100 - efectivoPct)) / 100),
                label: "efectivo",
              });
            if (transferenciaPct > 0)
              chips.push({
                price: Math.round((base * (100 - transferenciaPct)) / 100),
                label: "transferencia",
              });
            return chips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-baseline gap-1 rounded-full border border-line bg-cream px-2.5 py-1 text-ink"
                  >
                    <span className="font-black text-sm">
                      {formatPrice(c.price)}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      {c.label}
                    </span>
                  </span>
                ))}
              </div>
            ) : null;
          })()}
          <button
            type="button"
            onClick={handleAdd}
            disabled={selectedOutOfStock}
            className="mt-3 w-full overflow-hidden bg-black px-4 py-3 font-bold uppercase tracking-widest text-xs text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted sm:mt-4 sm:py-3.5 sm:text-sm"
          >
            {selectedOutOfStock
            ? outOfStockLabel
            : justAdded
            ? "Agregado ✓"
            : addToCartLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
