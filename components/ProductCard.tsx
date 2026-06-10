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

  // Which empanado is selected (desktop pill selector + mobile sheet).
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );
  const [justAdded, setJustAdded] = useState(false);
  // Mobile-only: bottom sheet open to pick breadcrumb when >1 option.
  const [sheetOpen, setSheetOpen] = useState(false);

  const cover = product.imagesByBreadcrumb[selected]?.[0] ?? product.imageUrl;
  const selectedOutOfStock = stockFor(product, selected) <= 0;
  const allOutOfStock = isProductOutOfStock(product);
  const selPromoPercent = promoPercentFor(product, selected);
  const selPromoType = promoTypeFor(product, selected);
  const hasMultipleBreadcrumbs = product.breadcrumbs.length > 1;

  function handleAdd() {
    if (selectedOutOfStock) return;
    addToCart(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  // On mobile: if only one breadcrumb → add directly. If multiple → open sheet.
  function handleMobileAdd() {
    if (allOutOfStock) return;
    if (!hasMultipleBreadcrumbs) {
      handleAdd();
    } else {
      setSheetOpen(true);
    }
  }

  function handleSheetSelect(code: string) {
    setSelected(code);
    setSheetOpen(false);
    if (stockFor(product, code) <= 0) return;
    addToCart(product, code);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  const priceDisplay = selPromoPercent > 0 ? (
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
  );

  const paymentChips = (() => {
    const base = selPromoPercent > 0
      ? promoPriceFor(product, selected)
      : priceFor(product, selected);
    const chips: { price: number; label: string }[] = [];
    if (efectivoPct > 0)
      chips.push({ price: Math.round((base * (100 - efectivoPct)) / 100), label: "efectivo" });
    if (transferenciaPct > 0)
      chips.push({ price: Math.round((base * (100 - transferenciaPct)) / 100), label: "transferencia" });
    return chips;
  })();

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-[0_1px_0_rgba(10,10,10,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_22px_55px_rgba(10,10,10,0.10)]">
        {/* Photo */}
        <Link
          href={`/producto/${product.slug}`}
          className="relative block aspect-[2/3] w-full overflow-hidden bg-cream"
          aria-label={`Ver ${product.name}`}
        >
          <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center px-6 text-center font-black uppercase tracking-tight text-line">
            {product.name}
          </span>
          <div
            key={cover}
            className={`absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 ease-out ${
              allOutOfStock ? "opacity-40 grayscale" : "group-hover:scale-105"
            }`}
            style={{ backgroundImage: `url('${cover}')` }}
          />

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {!allOutOfStock && selPromoType && (
              <span className="bg-accent px-2 py-1 font-black uppercase tracking-widest text-[11px] text-white shadow-md sm:px-3 sm:py-1.5 sm:text-sm">
                {selPromoType}
              </span>
            )}
            {!allOutOfStock && selPromoPercent > 0 && (
              <span className="bg-accent px-2 py-1 font-black uppercase tracking-widest text-[11px] text-white shadow-md sm:px-3 sm:py-1.5 sm:text-sm">
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

          {/* Empanado selector — desktop only */}
          <div className="mt-3 hidden sm:mt-4 sm:block">
            <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
              {chooseBreadcrumbLabel}
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
                    className={`rounded-full border border-black px-3 py-1.5 font-bold uppercase tracking-wide text-xs transition-all duration-200 ${
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

          {/* Price + CTA */}
          <div className="mt-auto pt-4 sm:pt-5">
            {priceDisplay}

            {paymentChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {paymentChips.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-baseline gap-1 rounded-full border border-line bg-cream px-2.5 py-1 text-ink"
                  >
                    <span className="font-black text-sm">
                      {formatPrice(c.price)}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      <span className="sm:hidden">
                        {c.label === "transferencia" ? "transf." : c.label}
                      </span>
                      <span className="hidden sm:inline">{c.label}</span>
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Desktop: normal add button */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedOutOfStock}
              className="mt-3 hidden w-full overflow-hidden bg-black px-4 py-3.5 font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted sm:mt-4 sm:block"
            >
              {selectedOutOfStock ? outOfStockLabel : justAdded ? "Agregado ✓" : addToCartLabel}
            </button>

            {/* Mobile: opens sheet if >1 breadcrumb */}
            <button
              type="button"
              onClick={handleMobileAdd}
              disabled={allOutOfStock}
              className="mt-3 w-full overflow-hidden bg-black px-4 py-3 font-bold uppercase tracking-widest text-xs text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted sm:hidden"
            >
              {allOutOfStock ? outOfStockLabel : justAdded ? "Agregado ✓" : addToCartLabel}
            </button>
          </div>
        </div>
      </article>

      {/* Mobile breadcrumb picker — bottom sheet */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-[0_-18px_45px_rgba(10,10,10,0.15)] sm:hidden">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-black uppercase tracking-tight text-lg text-ink">
                {product.name}
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1 text-muted"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <p className="mb-5 font-bold uppercase tracking-wide text-xs text-muted">
              {chooseBreadcrumbLabel}
            </p>
            <div className="flex flex-col gap-3">
              {product.breadcrumbs.map((code) => {
                const outOfStock = stockFor(product, code) <= 0;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => !outOfStock && handleSheetSelect(code)}
                    disabled={outOfStock}
                    className="flex w-full flex-col items-start rounded-lg border border-line px-4 py-3.5 transition-colors hover:border-ink hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="font-bold uppercase tracking-wide text-sm text-ink">
                      {BREADCRUMB_LABELS[code] ?? code}
                    </span>
                    {outOfStock ? (
                      <span className="mt-0.5 text-xs text-muted">{outOfStockLabel}</span>
                    ) : (
                      <span className="mt-0.5 font-black text-base text-ink">
                        {formatPrice(priceFor(product, code))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
