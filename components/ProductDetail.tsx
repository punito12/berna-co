"use client";

import { useState } from "react";
import Link from "next/link";
import ProductGallery from "@/components/ProductGallery";
import AddToCartPanel from "@/components/AddToCartPanel";
import RichText from "@/components/RichText";
import {
  BREADCRUMB_LABELS,
  formatWeight,
  type ProductForUI,
} from "@/lib/products";

type ProductDetailLabels = {
  chooseBreadcrumb?: string;
  addToCart?: string;
  outOfStock?: string;
  lowStock?: string;
  addedDetail?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  CARNE: "CARNE",
  POLLO: "POLLO",
  CERDO: "CERDO",
  VEGANO: "VEGGIE",
};

// Two-column product detail. Holds the selected empanado so the gallery (left)
// and the buy controls (right) stay in sync: choosing a breadcrumb swaps the
// photos to that variant's packaging.
export default function ProductDetail({
  product,
  labels = {},
}: {
  product: ProductForUI;
  labels?: ProductDetailLabels;
}) {
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );

  const images = product.imagesByBreadcrumb[selected] ?? [];
  const descriptionStyle: React.CSSProperties = {
    fontFamily: "var(--description-font, var(--font-fraunces), serif)",
  };
  const categoryLabel = CATEGORY_LABELS[product.category] ?? product.category;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:gap-14">
      {/* Gallery — `key` resets the active thumbnail when the empanado changes */}
      <ProductGallery
        key={selected}
        images={images}
        name={product.name}
        isNew={product.isNew}
        category={categoryLabel}
      />

      {/* Info + buy */}
      <div className="lg:pt-4" data-cms-section="product.info">
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full border border-line bg-white px-3 py-1 font-bold uppercase tracking-[0.22em] text-[11px] text-muted">
            {categoryLabel}
          </p>
          <p className="rounded-full border border-line bg-white px-3 py-1 font-bold uppercase tracking-wide text-[11px] text-muted">
            {formatWeight(product.weightGrams)}
          </p>
        </div>
        <h1 className="mt-3 max-w-2xl text-balance font-black uppercase tracking-tight text-4xl leading-[0.95] text-ink sm:text-6xl">
          {product.name}
        </h1>

        {/* Universal description (same for the whole cut). Falls back to the
            short one. Rendered with RichText so markdown styles show. La fuente
            (--description-font) va DIRECTO en el contenedor del texto (igual que
            la descripción corta de la card) para que el cambio de fuente del CMS
            aplique sí o sí, sin depender de herencia desde un wrapper externo. */}
        <RichText
          text={product.longDescription?.trim() || product.description}
          style={descriptionStyle}
          dataCmsSection="product.description"
          className="mt-5 border-y border-line py-5 text-base leading-relaxed text-ink/80 sm:mt-6 sm:py-6 sm:text-lg [&_p]:mt-2 first:[&_p]:mt-0"
        />

        {/* Per-empanado description: swaps when the customer picks a different
            empanado. Only shown when this empanado has its own text. */}
        {product.empanadoDescriptionByBreadcrumb[selected]?.trim() && (
          <div className="mt-4 rounded-lg border border-line bg-cream/40 p-4 sm:p-5">
            <p className="mb-1 font-bold uppercase tracking-wide text-[11px] text-muted">
              {BREADCRUMB_LABELS[selected] ?? selected}
            </p>
            <RichText
              text={product.empanadoDescriptionByBreadcrumb[selected]}
              style={descriptionStyle}
              className="text-base leading-relaxed text-ink/80 sm:text-lg [&_p]:mt-2 first:[&_p]:mt-0"
            />
          </div>
        )}

        {/* Si no quedó ningún empanado con stock (link directo a un producto
            agotado), mostramos un estado limpio "sin stock" en vez del panel de
            compra. Nunca se permite agregar al carrito una variante agotada. */}
        {product.breadcrumbs.length === 0 ? (
          <div
            data-cms-section="product.purchase"
            className="mt-5 rounded-lg border border-line bg-white p-5 text-center shadow-[0_14px_34px_rgba(10,10,10,0.07)] sm:mt-6"
          >
            <p className="font-black uppercase tracking-wide text-sm text-ink">
              {labels?.outOfStock ?? "Sin stock"}
            </p>
            <p className="mt-2 text-sm text-muted">
              Por el momento no tenemos stock de este producto. Volvé pronto o
              mirá el resto del catálogo.
            </p>
            <Link
              href="/#productos"
              className="mt-4 inline-block bg-black px-6 py-3 font-bold uppercase tracking-widest text-xs text-white"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <AddToCartPanel
            product={product}
            selected={selected}
            onSelect={setSelected}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}
