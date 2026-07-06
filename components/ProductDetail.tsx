"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track-client";
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

  // Analytics: vista de producto (una vez al montar la ficha).
  useEffect(() => {
    track("product_view", {
      productId: product.id,
      productName: product.name,
      variantName: product.breadcrumbs[0] ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Cambio de empanado: variant_selected (además de actualizar la galería).
  function handleSelect(breadcrumb: string) {
    setSelected(breadcrumb);
    track("variant_selected", {
      productId: product.id,
      productName: product.name,
      variantName: breadcrumb,
    });
  }

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

      {/* Info + buy — entrada en capas al montar (animate-fade-up + delays).
          flex-col: el panel de compra se empuja al fondo (mt-auto) para quedar
          alineado con el borde INFERIOR de la foto. */}
      <div className="flex flex-col lg:pt-4" data-cms-section="product.info">
        <div className="animate-fade-up flex flex-wrap items-center gap-2">
          {/* Categoría como sello tinta + peso como píldora glass */}
          <p className="rounded-full bg-ink px-4 py-1.5 font-bold uppercase tracking-[0.22em] text-[11px] text-white shadow-[0_8px_25px_rgba(10,10,10,0.2)]">
            {categoryLabel}
          </p>
          <p className="rounded-full border border-line bg-white/85 px-4 py-1.5 font-bold uppercase tracking-widest text-[11px] text-ink backdrop-blur-xl">
            {formatWeight(product.weightGrams)}
          </p>
        </div>
        <h1
          className="animate-fade-up mt-4 max-w-2xl text-balance font-black uppercase tracking-tight text-4xl leading-[0.95] text-ink sm:text-7xl"
          style={{ animationDelay: "90ms" }}
        >
          {product.name}
        </h1>

        {/* Universal description (same for the whole cut). Falls back to the
            short one. Rendered with RichText so markdown styles show. La fuente
            (--description-font) va DIRECTO en el contenedor del texto (igual que
            la descripción corta de la card) para que el cambio de fuente del CMS
            aplique sí o sí, sin depender de herencia desde un wrapper externo. */}
        <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
          <RichText
            text={product.longDescription?.trim() || product.description}
            style={descriptionStyle}
            dataCmsSection="product.description"
            className="mt-5 border-y border-line py-5 font-serif italic text-base leading-relaxed text-ink/80 sm:mt-6 sm:py-6 sm:text-lg [&_p]:mt-2 first:[&_p]:mt-0"
          />
        </div>

        {/* Per-empanado description: swaps when the customer picks a different
            empanado. Only shown when this empanado has its own text. */}
        {product.empanadoDescriptionByBreadcrumb[selected]?.trim() && (
          <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4 backdrop-blur-sm sm:p-5">
            <p className="mb-1.5 inline-block rounded-full bg-ink px-3 py-1 font-bold uppercase tracking-widest text-[10px] text-white">
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
            className="mt-5 rounded-3xl border border-line bg-white p-6 text-center shadow-[0_14px_34px_rgba(10,10,10,0.07)] sm:mt-6"
          >
            <p className="font-black uppercase tracking-wide text-sm text-ink">
              {labels?.outOfStock ?? "Sin stock"}
            </p>
            <p className="mt-2 font-serif italic text-base text-muted">
              Por el momento no tenemos stock de este producto. Volvé pronto o
              mirá el resto del catálogo.
            </p>
            <Link
              href="/#productos"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-7 py-3 font-bold uppercase tracking-widest text-xs text-white transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <div
            className="animate-fade-up mt-6 lg:mt-auto lg:pt-6"
            style={{ animationDelay: "270ms" }}
          >
            <AddToCartPanel
              product={product}
              selected={selected}
              onSelect={handleSelect}
              labels={labels}
            />
          </div>
        )}
      </div>
    </div>
  );
}
