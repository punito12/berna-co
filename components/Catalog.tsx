"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  type ProductForUI,
} from "@/lib/products";

// One line in the cart. Same product with a different empanado is a separate line.
type CartLine = {
  key: string; // productId + breadcrumbType
  productId: string;
  name: string;
  breadcrumbType: string;
  price: number;
  quantity: number;
};

export default function Catalog({ products }: { products: ProductForUI[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  function addToCart(product: ProductForUI, breadcrumbType: string) {
    const key = `${product.id}__${breadcrumbType}`;
    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          breadcrumbType,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function changeQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  const totalItems = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );
  const totalPrice = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );

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
            <ProductCard
              key={product.id}
              product={product}
              onAdd={addToCart}
            />
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
                {cart.map((line) => (
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
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed bg-black px-4 py-4 font-bold uppercase tracking-widest text-sm text-white opacity-60"
                  title="El checkout llega en el Paso 2"
                >
                  Continuar — próximamente
                </button>
                <p className="mt-2 text-center text-xs text-muted">
                  El checkout y la entrega se construyen en el próximo paso.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
