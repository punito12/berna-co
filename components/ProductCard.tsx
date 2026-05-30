"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  formatWeight,
  type ProductForUI,
} from "@/lib/products";

export default function ProductCard({ product }: { product: ProductForUI }) {
  const { addToCart } = useCart();

  // Local UI state only: which empanado the customer picked. Defaults to first.
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addToCart(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-xl">
      {/* Photo. Missing files simply show the cream block underneath — no
          broken-image icon. Drop the .jpg into /public/images/productos/. */}
      <div className="relative aspect-square w-full overflow-hidden bg-cream">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url('${product.imageUrl}')` }}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-black uppercase tracking-tight text-line">
          {product.name}
        </span>

        {product.isNew && (
          <span className="absolute left-3 top-3 bg-ink px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-white">
            New
          </span>
        )}

        <span className="absolute right-3 top-3 bg-white/90 px-2.5 py-1 font-bold uppercase tracking-widest text-[10px] text-ink backdrop-blur-sm">
          {product.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-bold uppercase tracking-tight text-lg text-ink">
          {product.name}
        </h3>
        <p className="mt-0.5 font-bold uppercase tracking-wide text-xs text-muted">
          {formatWeight(product.weightGrams)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {product.description}
        </p>

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

        {/* Price + add button pinned to the bottom of the card */}
        <div className="mt-auto pt-5">
          <p className="font-black text-2xl text-black">
            {formatPrice(product.price)}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 w-full overflow-hidden bg-black px-4 py-3 font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80"
          >
            {justAdded ? "Agregado ✓" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
