"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  priceFor,
  stockFor,
  type ProductForUI,
} from "@/lib/products";

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
  };
}) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Stock of the currently selected empanado.
  const stock = stockFor(product, selected);
  const outOfStock = stock <= 0;

  // When the empanado changes, clamp the quantity to that variant's stock.
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, stock)));
  }, [selected, stock]);

  function handleAdd() {
    if (outOfStock) return;
    // Add the chosen quantity (addToCart adds one unit per call).
    for (let i = 0; i < qty; i++) addToCart(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-[0_1px_0_rgba(10,10,10,0.03)] sm:p-6">
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
      <div className="mt-6">
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Cantidad
        </p>
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
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            disabled={qty >= stock}
            aria-label="Agregar uno"
            className="h-9 w-9 rounded-full border border-black bg-white font-bold text-ink transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* Price + add — follows the chosen empanado */}
      <div className="mt-8 border-t border-line pt-6">
        <p className="font-black text-3xl text-black">
          {formatPrice(priceFor(product, selected))}
        </p>
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className="mt-4 w-full bg-black px-4 py-4 font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted"
        >
          {outOfStock
            ? labels.outOfStock ?? "Sin stock"
            : justAdded
            ? "Agregado al carrito ✓"
            : labels.addToCart ?? "Agregar al carrito"}
        </button>
        {outOfStock && (
          <p className="mt-3 text-center text-sm font-bold uppercase tracking-wide text-muted">
            {labels.outOfStock ?? "Producto sin stock por el momento"}
          </p>
        )}
      </div>
    </div>
  );
}
