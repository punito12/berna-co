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
  cashPriceFor,
  hasCashPrice,
  stockFor,
  type ProductForUI,
} from "@/lib/products";
import { renderCmsTemplate } from "@/lib/catalog-cms-labels";

// Panel de compra del detalle: panel TINTA compacto (mismo lenguaje que el
// carrito flotante) con empanado, cantidad + precio en una fila y CTA crema.
// El empanado seleccionado lo controla el padre (ProductDetail) para que la
// galería reaccione. El stock solo se comunica cuando queda UNA unidad.
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
    lastUnit?: string;
    cashShort?: string;
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
  // Precio efectivo/transferencia (precio base). Solo se muestra como línea
  // aparte cuando está cargado y difiere del precio web mostrado.
  const cashPrice = cashPriceFor(product, selected);
  const showCashPrice =
    hasCashPrice(product, selected) &&
    cashPrice > 0 &&
    cashPrice !== displayPrice;

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
    <>
      <div
        data-cms-section="product.purchase"
        className="rounded-3xl bg-ink p-4 text-white shadow-[0_25px_60px_rgba(10,10,10,0.3)] sm:p-6"
      >
        {/* Empanado — siempre visible; con una sola opción queda como pill
            activa informativa (que se sepa qué empanado lleva). */}
        {product.breadcrumbs.length > 0 && (
          <div data-cms-section="product.breading">
            <p className="font-bold uppercase tracking-[0.2em] text-[11px] text-cream/60">
              {labels.chooseBreadcrumb ?? "Empanado"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {product.breadcrumbs.map((code) => {
                const active = code === selected;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onSelect(code)}
                    aria-pressed={active}
                    className={`inline-flex min-h-9 items-center rounded-full px-3.5 py-1.5 font-bold uppercase tracking-wide text-[11px] transition-all duration-200 active:scale-95 sm:min-h-11 sm:px-4 sm:py-2 sm:text-xs ${
                      active
                        ? "bg-white text-ink shadow-sm"
                        : "border border-white/30 text-white hover:bg-white/10"
                    }`}
                  >
                    {BREADCRUMB_LABELS[code] ?? code}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cantidad (izq) + precio (der) en una sola fila */}
        <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Quitar uno"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-base transition-colors hover:bg-white hover:text-ink sm:h-11 sm:w-11 sm:text-lg"
            >
              −
            </button>
            <span className="w-8 text-center font-black text-lg tabular-nums sm:text-xl">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxAddable, q + 1))}
              disabled={qty >= maxAddable || outOfStock}
              aria-label="Agregar uno"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-base transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white sm:h-11 sm:w-11 sm:text-lg"
            >
              +
            </button>
          </div>

          <div className="text-left sm:text-right">
            <div className="flex items-baseline justify-start gap-2 sm:justify-end">
              {promoPercent > 0 && (
                <span className="text-sm font-bold text-white/50 line-through">
                  {formatPrice(basePrice)}
                </span>
              )}
              <p
                className="font-black text-2xl leading-none tabular-nums sm:text-3xl"
              >
                {formatPrice(displayPrice)}
              </p>
            </div>
            {showCashPrice && (
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-cream/60">
                {labels.cashShort ?? "Efectivo o transferencia"}{" "}
                <span className="text-base font-black tabular-nums text-white">
                  {formatPrice(cashPrice)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Sellos: última unidad / promo. El stock NO se muestra salvo que
            quede exactamente una. */}
        {(promoPercent > 0 || promoType || (stock === 1 && !outOfStock)) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stock === 1 && !outOfStock && (
              <span
                data-cms-section="product.stock"
                className="rounded-full bg-cream px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-ink"
              >
                {labels.lastUnit ?? "¡Queda la última!"}
              </span>
            )}
            {promoPercent > 0 && (
              <span className="rounded-full bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-ink">
                -{promoPercent}%
              </span>
            )}
            {promoType && (
              <span className="rounded-full border border-white/30 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-white">
                {promoType}
              </span>
            )}
          </div>
        )}

        {/* CTA crema */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          data-cms-button="product.add"
          className="mt-4 w-full rounded-full bg-cream px-4 py-3 font-black uppercase tracking-widest text-xs text-ink sm:mt-5 sm:py-4 sm:text-sm transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/50"
        >
          {/* key remonta el span al confirmar → pop de sello */}
          <span
            key={String(justAdded)}
            className={
              justAdded ? "inline-block animate-counter-pop" : "inline-block"
            }
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
          </span>
        </button>
        {inCart > 0 && (
          <p className="mt-2.5 text-center text-xs font-bold text-cream/60">
            Tenés {inCart} en el carrito
          </p>
        )}
      </div>
    </>
  );
}
