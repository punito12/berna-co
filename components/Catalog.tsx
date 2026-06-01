"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { useCart } from "@/components/CartProvider";
import { BREADCRUMB_LABELS, formatPrice, type ProductForUI } from "@/lib/products";

// Human labels for the category filter chips.
const CATEGORY_LABELS: Record<string, string> = {
  CARNE: "Carne",
  POLLO: "Pollo",
  CERDO: "Cerdo",
  VEGANO: "Vegano",
};

export default function Catalog({ products }: { products: ProductForUI[] }) {
  const { lines, totalItems, totalPrice, changeQuantity } = useCart();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("ALL");

  // Categories present in the catalog, kept in a stable, sensible order.
  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return ["CARNE", "POLLO", "CERDO", "VEGANO"].filter((c) => present.has(c));
  }, [products]);

  const visible = useMemo(
    () =>
      category === "ALL"
        ? products
        : products.filter((p) => p.category === category),
    [products, category]
  );

  return (
    <section id="productos" className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <Reveal as="header" className="mb-12 text-center">
          <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
            Congelados Caseros
          </p>
          <h2 className="mt-3 font-black uppercase tracking-tight text-4xl sm:text-6xl text-ink">
            Nuestros productos
          </h2>
          <p className="mx-auto mt-4 max-w-md font-serif italic text-lg text-muted">
            Elegí tu corte y tu empanado. Listas para el horno.
          </p>
        </Reveal>

        {/* Category filter */}
        <Reveal className="mb-10 flex flex-wrap justify-center gap-2" delay={80}>
          <FilterChip
            active={category === "ALL"}
            onClick={() => setCategory("ALL")}
          >
            Todos
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c] ?? c}
            </FilterChip>
          ))}
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product, i) => (
            <Reveal key={product.id} delay={(i % 3) * 90}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Sticky cart bar — only when there is something in the cart */}
      {totalItems > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
          {/* Extra right padding (pr-20) keeps the total clear of the floating
              WhatsApp button in the corner. */}
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-3 pl-4 pr-20">
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
                          className="h-7 w-7 border border-black font-bold text-ink transition-colors hover:bg-black hover:text-white"
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
                          className="h-7 w-7 border border-black font-bold text-ink transition-colors hover:bg-black hover:text-white"
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 font-bold uppercase tracking-wide text-xs transition-colors ${
        active
          ? "border-black bg-black text-white"
          : "border-line bg-white text-ink hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}
