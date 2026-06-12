"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { useCart } from "@/components/CartProvider";
import { BREADCRUMB_LABELS, formatPrice, type ProductForUI } from "@/lib/products";

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  CARNE: "Carne",
  POLLO: "Pollo",
  CERDO: "Cerdo",
  VEGANO: "Vegano",
};

export default function Catalog({
  products,
  efectivoPct = 0,
  transferenciaPct = 0,
  eyebrow = "Congelados Caseros",
  title = "Nuestros productos",
  subtitle = "Elegí tu corte y tu empanado. Listas para el horno.",
  allLabel = "Todos",
  outOfStockLabel = "Sin stock",
  categoryLabels = DEFAULT_CATEGORY_LABELS,
  addToCartLabel = "Agregar al carrito",
  chooseBreadcrumbLabel = "Empanado",
  newLabel = "New",
  textKeys = {},
}: {
  products: ProductForUI[];
  efectivoPct?: number;
  transferenciaPct?: number;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  allLabel?: string;
  outOfStockLabel?: string;
  categoryLabels?: Record<string, string>;
  addToCartLabel?: string;
  chooseBreadcrumbLabel?: string;
  newLabel?: string;
  textKeys?: Partial<Record<
    | "eyebrow"
    | "title"
    | "subtitle"
    | "allLabel"
    | "outOfStockLabel"
    | "addToCartLabel"
    | "chooseBreadcrumbLabel"
    | "newLabel",
    string
  >>;
}) {
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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
        <Reveal as="header" className="mb-10 text-center sm:mb-12">
          <p
            className="font-bold uppercase tracking-[0.3em] text-xs text-muted"
            data-cms-text={textKeys.eyebrow}
          >
            {eyebrow}
          </p>
          <h2
            className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl"
            data-cms-text={textKeys.title}
          >
            {title}
          </h2>
          <p
            className="mx-auto mt-4 max-w-md font-serif italic text-lg text-muted"
            data-cms-text={textKeys.subtitle}
          >
            {subtitle}
          </p>
        </Reveal>

        {/* Category filter */}
        <Reveal className="mb-10 flex flex-wrap justify-center gap-2 sm:mb-12" delay={80}>
          <FilterChip
            active={category === "ALL"}
            onClick={() => setCategory("ALL")}
            textKey={textKeys.allLabel}
          >
            {allLabel}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {categoryLabels[c] ?? c}
            </FilterChip>
          ))}
        </Reveal>

        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {visible.map((product, i) => (
            <Reveal key={product.id} className="min-w-0" delay={(i % 3) * 90}>
              <ProductCard
                product={product}
                efectivoPct={efectivoPct}
                transferenciaPct={transferenciaPct}
                outOfStockLabel={outOfStockLabel}
                addToCartLabel={addToCartLabel}
                chooseBreadcrumbLabel={chooseBreadcrumbLabel}
                newLabel={newLabel}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Sticky cart bar — only when there is something in the cart */}
      {totalItems > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 shadow-[0_-18px_45px_rgba(10,10,10,0.08)] backdrop-blur-xl">
          {/* Extra right padding (pr-20) keeps the total clear of the floating
              WhatsApp button in the corner. */}
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-3 pl-4 pr-20 sm:pr-4">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 font-bold uppercase tracking-wide text-sm text-ink transition-colors hover:text-muted"
            >
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-2 text-xs text-white shadow-sm">
                {totalItems}
              </span>
              {open ? "Ocultar carrito" : "Ver carrito"}
            </button>
            <span className="font-black text-xl text-ink">
              {formatPrice(totalPrice)}
            </span>
          </div>

          {open && (
            <div className="animate-soft-pop border-t border-line bg-white">
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
                          className="h-8 w-8 border border-black font-bold text-ink transition-colors hover:bg-black hover:text-white"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold text-ink">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.key, 1)}
                          disabled={
                            typeof line.maxStock === "number" &&
                            line.quantity >= line.maxStock
                          }
                          aria-label="Agregar uno"
                          className="h-8 w-8 border border-black font-bold text-ink transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-ink"
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
                  className="block w-full bg-black px-4 py-4 text-center font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0"
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
  textKey,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  textKey?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-cms-text={textKey}
      className={`rounded-full border px-4 py-2 font-bold uppercase tracking-wide text-xs transition-all duration-200 ${
        active
          ? "border-black bg-black text-white shadow-sm"
          : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}
