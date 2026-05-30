"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  priceFor,
  type ProductForUI,
} from "@/lib/products";

// The interactive buying controls on the product detail page: empanado picker,
// quantity, price and add-to-cart. The selected empanado is controlled by the
// parent (ProductDetail) so the photo gallery can react to it.
export default function AddToCartPanel({
  product,
  selected,
  onSelect,
}: {
  product: ProductForUI;
  selected: string;
  onSelect: (breadcrumb: string) => void;
}) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    // Add the chosen quantity (addToCart adds one unit per call).
    for (let i = 0; i < qty; i++) addToCart(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <div>
      {/* Empanado selector */}
      <div className="mt-6">
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
                onClick={() => onSelect(code)}
                aria-pressed={active}
                className={`rounded-full border border-black px-4 py-1.5 font-bold uppercase tracking-wide text-xs transition-colors ${
                  active ? "bg-black text-white" : "bg-white text-black hover:bg-cream"
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Quitar uno"
            className="h-9 w-9 border border-black font-bold text-ink transition-colors hover:bg-black hover:text-white"
          >
            −
          </button>
          <span className="w-8 text-center font-black text-lg text-ink">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Agregar uno"
            className="h-9 w-9 border border-black font-bold text-ink transition-colors hover:bg-black hover:text-white"
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
          className="mt-4 w-full bg-black px-4 py-4 font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80"
        >
          {justAdded ? "Agregado al carrito ✓" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
