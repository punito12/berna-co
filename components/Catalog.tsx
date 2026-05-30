"use client";

import Link from "next/link";
import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import { BREADCRUMB_LABELS, formatPrice, type ProductForUI } from "@/lib/products";

export default function Catalog({ products }: { products: ProductForUI[] }) {
  const { lines, totalItems, totalPrice, changeQuantity } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <section id="productos" className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <header className="mb-10 text-center">
          <p className="font-bold uppercase tracking-wide text-sm text-muted">
            Congelados Caseros
          </p>
          <h2 className="mt-2 font-black uppercase tracking-tight text-4xl sm:text-5xl text-ink">
            Nuestros productos
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Sticky cart bar — only when there is something in the cart */}
      {totalItems > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 font-bold uppercase tracking-wide text-sm text-ink"
            >
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-2 text-xs text-white">
                {totalItems}
              </span>
              {open ? "Ocultar carrito" : "Ver carrito"}
            </button>
            <span className="font-black text-xl text-ink">
              {formatPrice(totalPrice)}
            </span>
          </div>

          {open && (
            <div className="border-t border-line bg-white">
              <ul className="mx-auto max-w-6xl divide-y divide-line px-4">
                {lines.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold uppercase tracking-tight text-sm text-ink">
                        {line.name}
                      </p>
                      <p className="text-xs text-muted">
                        Empanado:{" "}
                        {BREADCRUMB_LABELS[line.breadcrumbType] ??
                          line.breadcrumbType}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.key, -1)}
                          aria-label="Quitar uno"
                          className="h-7 w-7 border border-black font-bold text-ink"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold text-ink">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.key, 1)}
                          aria-label="Agregar uno"
                          className="h-7 w-7 border border-black font-bold text-ink"
                        >
                          +
                        </button>
                      </div>
                      <span className="w-24 text-right font-black text-ink">
                        {formatPrice(line.price * line.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mx-auto max-w-6xl px-4 py-4">
                <Link
                  href="/checkout"
                  className="block w-full bg-black px-4 py-4 text-center font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80"
                >
                  Continuar
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
