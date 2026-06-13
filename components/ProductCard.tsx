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
import { renderCmsTemplate } from "@/lib/catalog-cms-labels";

export default function ProductCard({
  product,
  efectivoPct = 0,
  transferenciaPct = 0,
  outOfStockLabel = "Sin stock",
  addToCartLabel = "Agregar al carrito",
  chooseBreadcrumbLabel = "Empanado",
  newLabel = "New",
  paymentCashLabel = "efectivo",
  paymentTransferLabel = "transferencia",
  paymentTransferShortLabel = "transf.",
  viewDetailLabel = "Ver detalle y fotos →",
  lowStockLabel = "Solo quedan {count} disponibles",
  addedLabel = "Agregado ✓",
  noMoreStockLabel = "Sin más stock disponible",
  previewToken,
}: {
  product: ProductForUI;
  efectivoPct?: number;
  transferenciaPct?: number;
  outOfStockLabel?: string;
  addToCartLabel?: string;
  chooseBreadcrumbLabel?: string;
  newLabel?: string;
  paymentCashLabel?: string;
  paymentTransferLabel?: string;
  paymentTransferShortLabel?: string;
  viewDetailLabel?: string;
  lowStockLabel?: string;
  addedLabel?: string;
  noMoreStockLabel?: string;
  // Token de preview del CMS. Si está, los links al detalle lo arrastran para
  // que la vista previa (fuentes/estilos de borrador) siga activa al entrar al
  // producto. Sin token, links normales.
  previewToken?: string;
}) {
  const { addToCart, lines } = useCart();

  // Link al detalle, arrastrando el token de preview si estamos en preview.
  const productHref = previewToken
    ? `/producto/${product.slug}?preview=${encodeURIComponent(previewToken)}`
    : `/producto/${product.slug}`;

  // Which empanado is selected (desktop pill selector + mobile sheet).
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );
  const [justAdded, setJustAdded] = useState(false);
  // Mobile-only: bottom sheet open to pick breadcrumb when >1 option.
  const [sheetOpen, setSheetOpen] = useState(false);

  const cover = product.imagesByBreadcrumb[selected]?.[0] ?? product.imageUrl;
  const selectedOutOfStock = stockFor(product, selected) <= 0;
  const selectedStock = stockFor(product, selected);
  const selectedInCart =
    lines.find((line) => line.key === `${product.id}__${selected}`)?.quantity ??
    0;
  const selectedAtLimit = selectedStock > 0 && selectedInCart >= selectedStock;
  const allOutOfStock = isProductOutOfStock(product);
  const selPromoPercent = promoPercentFor(product, selected);
  const selPromoType = promoTypeFor(product, selected);
  const hasMultipleBreadcrumbs = product.breadcrumbs.length > 1;
  const allAtCartLimit = product.breadcrumbs.every((code) => {
    const stock = stockFor(product, code);
    const inCart =
      lines.find((line) => line.key === `${product.id}__${code}`)?.quantity ??
      0;
    return stock <= 0 || inCart >= stock;
  });
  const selectedLowStockLabel = renderCmsTemplate(lowStockLabel, {
    count: selectedStock,
  });

  function handleAdd() {
    if (selectedOutOfStock || selectedAtLimit) return;
    const added = addToCart(product, selected);
    if (!added) return;
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
    const stock = stockFor(product, code);
    const inCart =
      lines.find((line) => line.key === `${product.id}__${code}`)?.quantity ??
      0;
    if (stock <= 0 || inCart >= stock) return;
    const added = addToCart(product, code);
    if (!added) return;
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  // Phase 3 Tanda 2 — non-color style settings via CSS vars. Each falls back to
  // the current design, so an unset var renders exactly like before.
  const primaryBtnStyle: React.CSSProperties = {
    borderRadius: "var(--btn-radius, 0px)",
    fontFamily: "var(--btn-font, inherit)",
    fontWeight: "var(--btn-weight, 700)" as React.CSSProperties["fontWeight"],
    textTransform:
      "var(--btn-transform, uppercase)" as React.CSSProperties["textTransform"],
  };
  const cardStyle: React.CSSProperties = {
    borderRadius: "var(--card-radius, 0.5rem)",
    borderWidth: "var(--card-border-width, 1px)",
    boxShadow: "var(--card-shadow, 0 1px 0 rgba(10,10,10,0.03))",
  };
  // Note: font-size for name/price is handled in globals.css via data-cms-style
  // + media query, so the default Tailwind responsive sizes are preserved when
  // no CMS size is set (inline font-size would override the sm: breakpoint).
  const nameStyle: React.CSSProperties = {
    fontFamily: "var(--name-font, inherit)",
    fontWeight: "var(--name-weight, 900)" as React.CSSProperties["fontWeight"],
    textTransform:
      "var(--name-transform, uppercase)" as React.CSSProperties["textTransform"],
    letterSpacing: "var(--name-spacing, normal)",
  };
  const priceStyle: React.CSSProperties = {
    fontFamily: "var(--price-font, inherit)",
    fontWeight: "var(--price-weight, 900)" as React.CSSProperties["fontWeight"],
    letterSpacing: "var(--price-spacing, normal)",
  };
  const chipStyle: React.CSSProperties = {
    borderRadius: "var(--chip-radius, 9999px)",
    fontWeight: "var(--chip-weight, 700)" as React.CSSProperties["fontWeight"],
  };
  const badgeStyle: React.CSSProperties = {
    borderRadius: "var(--badge-radius, 0px)",
    fontWeight: "var(--badge-weight, 700)" as React.CSSProperties["fontWeight"],
    textTransform:
      "var(--badge-transform, uppercase)" as React.CSSProperties["textTransform"],
  };

  const priceDisplay = selPromoPercent > 0 ? (
    <p className="flex min-w-0 flex-wrap items-baseline gap-2">
      <span data-cms-style="price" style={priceStyle} className="font-black text-xl text-price-promo sm:text-2xl">
        {formatPrice(promoPriceFor(product, selected))}
      </span>
      <span className="text-sm text-muted line-through">
        {formatPrice(priceFor(product, selected))}
      </span>
    </p>
  ) : (
    <p data-cms-style="price" style={priceStyle} className="font-black text-xl text-price sm:text-2xl">
      {formatPrice(priceFor(product, selected))}
    </p>
  );

  const paymentChips = (() => {
    const base = selPromoPercent > 0
      ? promoPriceFor(product, selected)
      : priceFor(product, selected);
    const chips: { price: number; label: string; shortLabel: string }[] = [];
    if (efectivoPct > 0)
      chips.push({
        price: Math.round((base * (100 - efectivoPct)) / 100),
        label: paymentCashLabel,
        shortLabel: paymentCashLabel,
      });
    if (transferenciaPct > 0)
      chips.push({
        price: Math.round((base * (100 - transferenciaPct)) / 100),
        label: paymentTransferLabel,
        shortLabel: paymentTransferShortLabel,
      });
    return chips;
  })();

  return (
    <>
      <article
        style={cardStyle}
        className="group flex h-full min-w-0 max-w-full flex-col overflow-hidden border border-card-border bg-card-bg transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_22px_55px_rgba(10,10,10,0.10)]"
      >
        {/* Photo */}
        <Link
          href={productHref}
          className="relative block aspect-[4/5] w-full overflow-hidden bg-white sm:aspect-[2/3]"
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

          <div className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3 sm:gap-1.5">
            {!allOutOfStock && selPromoType && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-promo-bg px-1.5 py-0.5 font-black uppercase tracking-wide text-[9px] text-badge-promo-text shadow-md sm:px-3 sm:py-1.5 sm:tracking-widest sm:text-sm">
                {selPromoType}
              </span>
            )}
            {!allOutOfStock && selPromoPercent > 0 && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-promo-bg px-1.5 py-0.5 font-black uppercase tracking-wide text-[9px] text-badge-promo-text shadow-md sm:px-3 sm:py-1.5 sm:tracking-widest sm:text-sm">
                -{selPromoPercent}%
              </span>
            )}
            {product.isNew && !allOutOfStock && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-new-bg px-1.5 py-0.5 font-bold uppercase tracking-wide text-[9px] text-badge-new-text sm:px-2.5 sm:py-1 sm:tracking-widest sm:text-[10px]">
                {newLabel}
              </span>
            )}
            {allOutOfStock && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-stock-bg px-1.5 py-0.5 font-bold uppercase tracking-wide text-[9px] text-badge-stock-text sm:px-2.5 sm:py-1 sm:tracking-widest sm:text-[10px]">
                {outOfStockLabel}
              </span>
            )}
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col p-2.5 pt-2 sm:p-5 md:p-6">
          <Link href={productHref}>
            <h3
              data-cms-style="name"
              style={nameStyle}
              className="break-words font-black uppercase tracking-tight text-base leading-tight text-product-name transition-colors hover:text-muted sm:text-xl"
            >
              {product.name}
            </h3>
          </Link>
          <p className="mt-0.5 font-bold uppercase tracking-wide text-xs text-muted">
            {formatWeight(product.weightGrams)}
          </p>
          <p
            style={{ fontFamily: "var(--description-font, inherit)" }}
            className="mt-3 hidden text-sm leading-relaxed text-muted sm:block"
          >
            {product.description}
          </p>

          <Link
            href={productHref}
            data-cms-style="button2"
            style={{
              fontFamily: "var(--btn2-font, inherit)",
              fontWeight:
                "var(--btn2-weight, 700)" as React.CSSProperties["fontWeight"],
              textTransform:
                "var(--btn2-transform, uppercase)" as React.CSSProperties["textTransform"],
              textDecoration: "var(--btn2-underline, none)",
            }}
            className="mt-1 inline-flex min-h-11 items-center font-bold uppercase tracking-widest text-[11px] text-button-secondary-text underline-offset-4 hover:underline sm:mt-2 sm:min-h-0"
          >
            {viewDetailLabel}
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
                    data-cms-style="empanado"
                    style={{
                      borderRadius: "var(--empanado-radius, 9999px)",
                      fontFamily: "var(--empanado-font, inherit)",
                      fontWeight: "var(--empanado-weight, 700)" as React.CSSProperties["fontWeight"],
                      textTransform: "var(--empanado-transform, uppercase)" as React.CSSProperties["textTransform"],
                    }}
                    className={`border border-empanado-border px-3 py-1.5 font-bold uppercase tracking-wide text-xs transition-all duration-200 ${
                      active
                        ? "bg-empanado-active-bg text-empanado-active-text shadow-sm"
                        : "bg-empanado-inactive-bg text-empanado-inactive-text hover:-translate-y-0.5 hover:bg-cream"
                    }`}
                  >
                    {BREADCRUMB_LABELS[code] ?? code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price + CTA */}
          <div className="mt-auto pt-3 sm:pt-5">
            {priceDisplay}

            {paymentChips.length > 0 && (
              <div className="mt-2 flex min-w-0 max-w-full flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap">
                {paymentChips.map((c) => (
                  <span
                    key={c.label}
                    data-cms-style="chip"
                    style={chipStyle}
                    className="inline-flex max-w-full items-baseline gap-1 border border-chip-border bg-chip-bg px-2 py-1 text-chip-text sm:px-2.5"
                  >
                    <span className="font-black text-sm">
                      {formatPrice(c.price)}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      <span className="sm:hidden">
                        {c.shortLabel}
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
              disabled={selectedOutOfStock || selectedAtLimit}
              data-cms-style="button"
              style={primaryBtnStyle}
              className="mt-3 hidden w-full overflow-hidden bg-button px-4 py-3.5 font-bold uppercase tracking-widest text-sm text-button-text shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted sm:mt-4 sm:block"
            >
              {selectedOutOfStock
                ? outOfStockLabel
                : selectedAtLimit
                ? selectedLowStockLabel
                : justAdded
                ? addedLabel
                : addToCartLabel}
            </button>

            {/* Mobile: opens sheet if >1 breadcrumb */}
            <button
              type="button"
              onClick={handleMobileAdd}
              disabled={allOutOfStock || allAtCartLimit}
              data-cms-style="button"
              style={primaryBtnStyle}
              className="mt-3 w-full overflow-hidden bg-button px-4 py-3 font-bold uppercase tracking-widest text-xs text-button-text shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted sm:hidden"
            >
              {allOutOfStock
                ? outOfStockLabel
                : allAtCartLimit
                ? noMoreStockLabel
                : justAdded
                ? addedLabel
                : addToCartLabel}
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
                const stock = stockFor(product, code);
                const inCart =
                  lines.find((line) => line.key === `${product.id}__${code}`)
                    ?.quantity ?? 0;
                const atLimit = stock > 0 && inCart >= stock;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => !outOfStock && !atLimit && handleSheetSelect(code)}
                    disabled={outOfStock || atLimit}
                    className="flex w-full flex-col items-start rounded-lg border border-line px-4 py-3.5 transition-colors hover:border-ink hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="font-bold uppercase tracking-wide text-sm text-ink">
                      {BREADCRUMB_LABELS[code] ?? code}
                    </span>
                    {outOfStock ? (
                      <span className="mt-0.5 text-xs text-muted">{outOfStockLabel}</span>
                    ) : atLimit ? (
                      <span className="mt-0.5 text-xs text-muted">
                        {renderCmsTemplate(lowStockLabel, { count: stock })}
                      </span>
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
