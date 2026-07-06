"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { type ProductForUI } from "@/lib/products";

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  CARNE: "Carne",
  POLLO: "Pollo",
  CERDO: "Cerdo",
  VEGANO: "Veggie",
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
  paymentCashLabel = "efectivo",
  paymentTransferLabel = "transferencia",
  paymentTransferShortLabel = "transf.",
  viewDetailLabel = "Ver detalle y fotos →",
  lowStockLabel = "Solo quedan {count} disponibles",
  addedLabel = "Agregado ✓",
  noMoreStockLabel = "Sin más stock disponible",
  headerPhotoUrl = "/images/nuestros-productos.jpg",
  headerLabel1Url = "/images/nuestros-productos-1.png",
  headerLabel2Url = "/images/nuestros-productos-2.png",
  textKeys = {},
  previewToken,
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
  paymentCashLabel?: string;
  paymentTransferLabel?: string;
  paymentTransferShortLabel?: string;
  viewDetailLabel?: string;
  lowStockLabel?: string;
  addedLabel?: string;
  noMoreStockLabel?: string;
  // Imágenes del bloque "nuestros productos" (editables desde el CMS).
  headerPhotoUrl?: string;
  headerLabel1Url?: string;
  headerLabel2Url?: string;
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
  // Token de preview del CMS: se pasa a cada card para arrastrarlo al link del
  // detalle del producto y mantener la vista previa activa.
  previewToken?: string;
}) {
  const [category, setCategory] = useState<string>("ALL");

  // Sincronización con las píldoras de filtro del header flotante:
  // el header dispara "berna:set-category" y acá se aplica; cada cambio local
  // se anuncia con "berna:category" para que el header marque la activa.
  useEffect(() => {
    function onSet(e: Event) {
      const code = (e as CustomEvent<string>).detail;
      if (typeof code === "string") setCategory(code);
    }
    window.addEventListener("berna:set-category", onSet);
    return () => window.removeEventListener("berna:set-category", onSet);
  }, []);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("berna:category", { detail: category })
    );
  }, [category]);

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

  function categoryLabel(code: string): string {
    if (code === "VEGANO") return "Veggie";
    return categoryLabels[code] ?? code;
  }

  return (
    <section
      id="productos"
      data-cms-section="home.products"
      className="bg-cream"
    >
      {/* Ancho completo tipo CRAV: las cards aprovechan toda la página (con un
          respiro en los bordes), no una columna centrada. */}
      <div className="mx-auto w-full max-w-[1800px] px-4 py-10 sm:px-8 sm:py-20">
        {/* Header tipo "sobre nosotros": texto a la izquierda (sello + título
            en 2 líneas con cortina direccional + subtítulo) y foto redondeada
            a la derecha, en dos columnas balanceadas. */}
        {/* "NUESTROS PRODUCTOS" (bloque texto + foto). Contenido en un ancho
            más angosto que el display: lejos de los bordes de la pantalla. */}
        <Reveal as="header" dataCmsSection="catalog.header" className="reveal-quiet mx-auto mb-10 w-full max-w-6xl sm:mb-16 sm:pt-6">
          <div className="grid items-stretch gap-8 sm:grid-cols-2 sm:gap-12">
            {/* Columna de texto: título + subtítulo + píldoras arriba, y las
                dos imágenes-píldora abajo (alineadas con el borde inferior de
                la foto vía mt-auto). */}
            {/* Mobile: sello, título y subtítulo centrados. Desktop: a la izq. */}
            <div className="flex flex-col text-center sm:text-left">
              <div>
              <p
                className="stamp-pop inline-block rounded-full bg-ink px-5 py-2 font-bold uppercase tracking-[0.25em] text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.2)]"
                data-cms-text={textKeys.eyebrow}
              >
                {eyebrow}
              </p>
              <h2
                className="title-curtain mt-6 font-black uppercase tracking-tight text-5xl leading-[0.95] text-ink sm:w-max sm:max-w-none sm:text-7xl lg:text-8xl"
                data-cms-text={textKeys.title}
              >
                <span className="title-slide">
                  {/* Una palabra por línea → "NUESTROS / PRODUCTOS" */}
                  {title.split(" ").map((word, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {word}
                    </Fragment>
                  ))}
                </span>
              </h2>
              </div>
              <p
                className="sub-fade mx-auto mt-6 max-w-md font-serif italic text-lg text-muted sm:mx-0 sm:text-2xl"
                data-cms-text={textKeys.subtitle}
              >
                {subtitle}
              </p>

              {/* Las dos etiquetas-píldora (PNG con exterior transparente y su
                  propia forma), lado a lado, apoyadas en el borde inferior de
                  la foto. Archivos: nuestros-productos-1.png / -2.png */}
              <div className="mt-8 hidden items-end gap-4 sm:mt-auto sm:flex sm:pt-8">
                <div
                  className="rise-in relative h-36 w-1/2 lg:h-44"
                  style={{ animationDelay: "950ms" }}
                >
                  <Image
                    src={headerLabel1Url}
                    alt="Huevos de gallinas libres"
                    fill
                    sizes="320px"
                    loading="eager"
                    className="object-contain object-left-bottom"
                  />
                </div>
                <div
                  className="rise-in relative h-36 w-1/2 lg:h-44"
                  style={{ animationDelay: "1080ms" }}
                >
                  <Image
                    src={headerLabel2Url}
                    alt="Empanado simple"
                    fill
                    sizes="320px"
                    loading="eager"
                    className="object-contain object-right-bottom"
                  />
                </div>
              </div>
            </div>

            {/* Foto, proporción 2:3 natural. MOBILE: va PRIMERA (order-first) y
                full-bleed de borde a borde (márgenes negativos que rompen el
                px-4 del contenedor, sin redondeo ni borde). Desktop: igual que
                siempre (derecha, redondeada, acotada). OJO: es un único div
                como item del grid — un wrapper con justify-self + hijo w-full
                colapsa a 0px de ancho. */}
            <div className="photo-reveal relative order-first -mx-4 aspect-[2/3] w-[calc(100%+2rem)] max-w-none overflow-hidden sm:order-none sm:mx-0 sm:w-full sm:max-w-sm sm:justify-self-end sm:rounded-3xl sm:border sm:border-line">
              <Image
                src={headerPhotoUrl}
                alt="Milanesas Berna&Co"
                fill
                sizes="(max-width: 640px) 90vw, 440px"
                // eager: decodificada ANTES de llegar scrolleando (el decode
                // lazy en pleno scroll trababa la animación de la sección)
                loading="eager"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>

        {/* DISPLAY (filtros + cards). El id lo observa HomeHeader para mostrar
            los cortes en el header solo dentro de esta zona. */}
        <div id="display">

        {/* Filtros: cápsula liquid glass, igual a la del header. El id lo
            observa HomeHeader: los cortes del header aparecen recién cuando
            esta cápsula ya quedó ARRIBA del viewport. */}
        <div id="display-filters">
        {/* Cápsula única liquid glass en TODOS los tamaños. En mobile los
            botones van lo más grandes posible sin quebrar a 2 líneas (texto
            10px, padding ajustado, sin tracking ancho). */}
        <Reveal dataCmsSection="catalog.filters" className="mb-8 flex justify-center sm:mb-12" delay={80}>
          <div className="flex items-center gap-0.5 rounded-full border border-line bg-white/85 p-1 shadow-[0_10px_30px_rgba(10,10,10,0.1)] backdrop-blur-xl sm:gap-1.5 sm:p-1.5">
            {[
              { code: "ALL", label: allLabel },
              ...categories.map((c) => ({ code: c, label: categoryLabel(c) })),
            ].map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setCategory(opt.code)}
                aria-pressed={category === opt.code}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 font-bold uppercase tracking-tight text-[11px] transition-colors duration-200 sm:min-h-11 sm:px-5 sm:py-2.5 sm:tracking-widest sm:text-xs ${
                  category === opt.code
                    ? "bg-ink text-white"
                    : "text-ink hover:bg-ink/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Reveal>
        </div>{/* /display-filters */}

        {/* flex + justify-center (en vez de grid): cuando el filtro deja una
            fila incompleta (3 carnes, 2 veggies), queda centrada. Los anchos
            calc replican las columnas del grid (2 en mobile, 4 en desktop). */}
        <div data-cms-section="catalog.cards" className="flex min-w-0 flex-wrap justify-center gap-4 sm:gap-6 lg:gap-7">
          {visible.map((product, i) => (
            <Reveal
              key={product.id}
              className="min-w-0 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.3125rem)]"
              delay={(i % 4) * 90}
            >
              <ProductCard
                product={product}
                efectivoPct={efectivoPct}
                transferenciaPct={transferenciaPct}
                outOfStockLabel={outOfStockLabel}
                addToCartLabel={addToCartLabel}
                chooseBreadcrumbLabel={chooseBreadcrumbLabel}
                newLabel={newLabel}
                paymentCashLabel={paymentCashLabel}
                paymentTransferLabel={paymentTransferLabel}
                paymentTransferShortLabel={paymentTransferShortLabel}
                viewDetailLabel={viewDetailLabel}
                lowStockLabel={lowStockLabel}
                addedLabel={addedLabel}
                noMoreStockLabel={noMoreStockLabel}
                previewToken={previewToken}
              />
            </Reveal>
          ))}
        </div>

        </div>{/* /display */}
      </div>

    </section>
  );
}

