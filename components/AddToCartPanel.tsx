"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  priceFor,
  promoPercentFor,
  promoPriceFor,
  promoTypeFor,
  stockFor,
  type ProductForUI,
} from "@/lib/products";
import { renderCmsTemplate } from "@/lib/catalog-cms-labels";

// The interactive buying controls on the product detail page: empanado picker,
// quantity, price and add-to-cart. The selected empanado is controlled by the
// parent (ProductDetail) so the photo gallery can react to it.
export default function AddToCartPanel({
  product,
  selected,
  onSelect,
  labels = {},
}: {
  product: ProductForUI;
  selected: string;
  onSelect: (breadcrumb: string) => void;
  labels?: {
    chooseBreadcrumb?: string;
    addToCart?: string;
    outOfStock?: string;
    lowStock?: string;
    added?: string;
    addedDetail?: string;
  };
}) {
  const { addToCart, lines } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Stock of the currently selected empanado.
  const stock = stockFor(product, selected);
  const inCart =
    lines.find((line) => line.key === `${product.id}__${selected}`)?.quantity ??
    0;
  const maxAddable = Math.max(0, stock - inCart);
  const outOfStock = stock <= 0 || maxAddable <= 0;
  const basePrice = priceFor(product, selected);
  const promoPercent = promoPercentFor(product, selected);
  const promoType = promoTypeFor(product, selected);
  const displayPrice = promoPriceFor(product, selected);
  const stockLabel =
    stock <= 0
      ? labels.outOfStock ?? "Sin stock"
      : stock <= 3
      ? `Quedan ${stock} disponibles`
      : "Disponible";

  // When the empanado changes, clamp the quantity to that variant's stock.
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, maxAddable)));
  }, [selected, maxAddable]);

  function handleAdd() {
    if (outOfStock) return;
    // Add the chosen quantity (addToCart adds one unit per call).
    for (let i = 0; i < qty; i++) addToCart(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_34px_rgba(10,10,10,0.07)] sm:mt-6">
      <div className="border-b border-line bg-cream/55 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold uppercase tracking-wide text-[11px] text-muted">
              Precio por unidad
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p
                style={{
                  fontFamily: "var(--price-font, inherit)",
                  fontWeight:
                    "var(--price-weight, 900)" as React.CSSProperties["fontWeight"],
                  letterSpacing: "var(--price-spacing, normal)",
                }}
                className="font-black text-3xl leading-none text-price sm:text-4xl"
              >
                {formatPrice(displayPrice)}
              </p>
              {promoPercent > 0 && (
                <span className="text-sm font-bold text-muted line-through">
                  {formatPrice(basePrice)}
                </span>
              )}
            </div>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
              stock <= 0
                ? "border-line bg-muted text-white"
                : stock <= 3
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-line bg-white text-ink"
            }`}
          >
            {stockLabel}
          </span>
        </div>
        {(promoPercent > 0 || promoType) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {promoPercent > 0 && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                -{promoPercent}%
              </span>
            )}
            {promoType && (
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                {promoType}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
      {/* Empanado selector */}
      <div>
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          {labels.chooseBreadcrumb ?? "Empanado"}
        </p>
        <div className="flex flex-wrap gap-2">
          {product.breadcrumbs.map((code) => {
            const active = code === selected;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                aria-pressed={active}
                className={`rounded-full border border-black px-4 py-2 font-bold uppercase tracking-wide text-xs transition-all duration-200 ${
                  active ? "bg-black text-white shadow-sm" : "bg-white text-black hover:-translate-y-0.5 hover:bg-cream"
                }`}
              >
                {BREADCRUMB_LABELS[code] ?? code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-bold uppercase tracking-wide text-[11px] text-muted">
            Cantidad
          </p>
          {stock > 0 && inCart > 0 && (
            <p className="text-xs font-bold text-muted">
              Tenés {inCart} en carrito
            </p>
          )}
        </div>
        <div className="inline-flex items-center gap-3 rounded-full border border-line bg-cream/60 p-1">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Quitar uno"
            className="h-9 w-9 rounded-full border border-black bg-white font-bold text-ink transition-colors hover:bg-black hover:text-white"
          >
            −
          </button>
          <span className="w-8 text-center font-black text-lg text-ink">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxAddable, q + 1))}
            disabled={qty >= maxAddable || outOfStock}
            aria-label="Agregar uno"
            className="h-9 w-9 rounded-full border border-black bg-white font-bold text-ink transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* Price + add — follows the chosen empanado */}
      <div className="mt-6 border-t border-line pt-5">
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          data-cms-style="button"
          style={{
            borderRadius: "var(--btn-radius, 0px)",
            fontFamily: "var(--btn-font, inherit)",
            fontWeight: "var(--btn-weight, 700)" as React.CSSProperties["fontWeight"],
            textTransform:
              "var(--btn-transform, uppercase)" as React.CSSProperties["textTransform"],
          }}
          className="w-full bg-button px-4 py-4 font-bold uppercase tracking-widest text-sm text-button-text shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted"
        >
          {outOfStock
            ? stock <= 0
              ? labels.outOfStock ?? "Sin stock"
              : renderCmsTemplate(
                  labels.lowStock ?? "Solo quedan {count} disponibles",
                  { count: stock }
                )
            : justAdded
            ? labels.addedDetail ?? "Agregado al carrito ✓"
            : labels.addToCart ?? "Agregar al carrito"}
        </button>
        {outOfStock && (
          <p className="mt-3 text-center text-sm font-bold uppercase tracking-wide text-muted">
            {stock <= 0
              ? labels.outOfStock ?? "Producto sin stock por el momento"
              : `Ya tenés ${inCart} en el carrito. ${renderCmsTemplate(
                  labels.lowStock ?? "Solo quedan {count} disponibles",
                  { count: stock }
                )}.`}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-2 border-t border-line pt-5 text-sm text-ink sm:grid-cols-3">
        <div className="rounded-md bg-cream/70 p-3">
          <p className="font-black uppercase tracking-wide text-[11px] text-muted">
            Envíos
          </p>
          <p className="mt-1 font-bold leading-snug">Zonas disponibles</p>
        </div>
        <div className="rounded-md bg-cream/70 p-3">
          <p className="font-black uppercase tracking-wide text-[11px] text-muted">
            Pagos
          </p>
          <p className="mt-1 font-bold leading-snug">Efectivo, transferencia o MP</p>
        </div>
        <div className="rounded-md bg-cream/70 p-3">
          <p className="font-black uppercase tracking-wide text-[11px] text-muted">
            Dudas
          </p>
          <p className="mt-1 font-bold leading-snug">Atención por WhatsApp</p>
        </div>
      </div>
      </div>
    </div>
  );
}
