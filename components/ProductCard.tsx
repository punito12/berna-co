"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import {
  BREADCRUMB_LABELS,
  formatPrice,
  formatWeight,
  priceFor,
  promoPriceFor,
  promoPercentFor,
  promoTypeFor,
  cashPriceFor,
  hasCashPrice,
  stockFor,
  isProductOutOfStock,
  type ProductForUI,
} from "@/lib/products";
import { renderCmsTemplate } from "@/lib/catalog-cms-labels";

export default function ProductCard({
  product,
  efectivoPct = 0,
  transferenciaPct = 0,
  outOfStockLabel = "Sin stock",
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
  addButtonStyle,
  detailButtonStyle,
  cardContainerStyle: cardContainerStyleProp,
  cardImageStyle: cardImageStyleProp,
  cardTitleStyle: cardTitleStyleProp,
  cardTextStyle: cardTextStyleProp,
  previewToken,
}: {
  product: ProductForUI;
  efectivoPct?: number;
  transferenciaPct?: number;
  outOfStockLabel?: string;
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
  addButtonStyle?: CSSProperties;
  detailButtonStyle?: CSSProperties;
  // Diseño de la tarjeta (fase 3): estilos inline derivados del config del
  // catálogo. Vacíos cuando no hay config → la tarjeta se ve como siempre.
  cardContainerStyle?: CSSProperties;
  cardImageStyle?: CSSProperties;
  cardTitleStyle?: CSSProperties;
  cardTextStyle?: CSSProperties;
  // Token de preview del CMS. Si está, los links al detalle lo arrastran para
  // que la vista previa (fuentes/estilos de borrador) siga activa al entrar al
  // producto. Sin token, links normales.
  previewToken?: string;
}) {
  const { addToCart, lines } = useCart();

  // Link al detalle, arrastrando el token de preview si estamos en preview.
  const productHref = previewToken
    ? `/producto/${product.slug}?preview=${encodeURIComponent(previewToken)}`
    : `/producto/${product.slug}`;

  // Which empanado is selected (desktop pill selector + mobile sheet).
  const [selected, setSelected] = useState<string>(
    product.breadcrumbs[0] ?? "TRADITIONAL"
  );
  const [justAdded, setJustAdded] = useState(false);
  // Mobile-only: el botón "+" abre el MISMO panel glass que el hover de
  // desktop (empanados + precio efectivo + agregar).
  const [panelOpen, setPanelOpen] = useState(false);

  const cover = product.imagesByBreadcrumb[selected]?.[0] ?? product.imageUrl;
  const selectedOutOfStock = stockFor(product, selected) <= 0;
  const selectedStock = stockFor(product, selected);
  const selectedInCart =
    lines.find((line) => line.key === `${product.id}__${selected}`)?.quantity ??
    0;
  const selectedAtLimit = selectedStock > 0 && selectedInCart >= selectedStock;
  const allOutOfStock = isProductOutOfStock(product);
  const selPromoPercent = promoPercentFor(product, selected);
  const selPromoType = promoTypeFor(product, selected);
  const hasMultipleBreadcrumbs = product.breadcrumbs.length > 1;
  const allAtCartLimit = product.breadcrumbs.every((code) => {
    const stock = stockFor(product, code);
    const inCart =
      lines.find((line) => line.key === `${product.id}__${code}`)?.quantity ??
      0;
    return stock <= 0 || inCart >= stock;
  });
  const selectedLowStockLabel = renderCmsTemplate(lowStockLabel, {
    count: selectedStock,
  });

  function handleAdd() {
    if (selectedOutOfStock || selectedAtLimit) return;
    const added = addToCart(product, selected);
    if (!added) return;
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  // Phase 3 Tanda 2 — non-color style settings via CSS vars. Each falls back to
  // the current design, so an unset var renders exactly like before.
  const primaryBtnStyle: React.CSSProperties = {
    borderRadius: "var(--btn-radius, 0px)",
    fontFamily: "var(--btn-font, inherit)",
    fontWeight: "var(--btn-weight, 700)" as React.CSSProperties["fontWeight"],
    textTransform:
      "var(--btn-transform, uppercase)" as React.CSSProperties["textTransform"],
  };
  const cardStyle: React.CSSProperties = {
    borderRadius: "var(--card-radius, 0.5rem)",
    borderWidth: "var(--card-border-width, 1px)",
    boxShadow: "var(--card-shadow, 0 1px 0 rgba(10,10,10,0.03))",
    // El diseño de tarjeta del editor (fase 3) pisa lo de arriba cuando existe.
    ...cardContainerStyleProp,
  };
  // Note: font-size for name/price is handled in globals.css via data-cms-style
  // + media query, so the default Tailwind responsive sizes are preserved when
  // no CMS size is set (inline font-size would override the sm: breakpoint).
  const nameStyle: React.CSSProperties = {
    fontFamily: "var(--name-font, inherit)",
    fontWeight: "var(--name-weight, 900)" as React.CSSProperties["fontWeight"],
    textTransform:
      "var(--name-transform, uppercase)" as React.CSSProperties["textTransform"],
    letterSpacing: "var(--name-spacing, normal)",
  };
  const priceStyle: React.CSSProperties = {
    fontFamily: "var(--price-font, inherit)",
    fontWeight: "var(--price-weight, 900)" as React.CSSProperties["fontWeight"],
    letterSpacing: "var(--price-spacing, normal)",
  };
  const chipStyle: React.CSSProperties = {
    borderRadius: "var(--chip-radius, 9999px)",
    fontWeight: "var(--chip-weight, 700)" as React.CSSProperties["fontWeight"],
  };
  const badgeStyle: React.CSSProperties = {
    borderRadius: "var(--badge-radius, 0px)",
    fontWeight: "var(--badge-weight, 700)" as React.CSSProperties["fontWeight"],
    textTransform:
      "var(--badge-transform, uppercase)" as React.CSSProperties["textTransform"],
  };

  // Precio principal = PRECIO WEB (lo que se muestra en el badge). El precio
  // efectivo/transferencia (precio base) va como línea aparte debajo, sin badge.
  const webShown =
    selPromoPercent > 0
      ? promoPriceFor(product, selected)
      : priceFor(product, selected);
  const cashShown = cashPriceFor(product, selected);
  const showCashPrice =
    hasCashPrice(product, selected) && cashShown > 0 && cashShown !== webShown;

  // Efectivo y transferencia comparten el mismo descuento global (config admin).
  // Ese % sigue como FALLBACK solo cuando el producto NO tiene precio
  // efectivo/transferencia cargado (así no hay doble descuento).
  const payDiscountPct = showCashPrice ? 0 : efectivoPct || transferenciaPct;

  return (
    <>
      <article
        style={cardStyle}
        data-cms-element="product-card"
        className="group relative flex h-full min-w-0 max-w-full flex-col overflow-hidden border border-card-border bg-card-bg transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_22px_55px_rgba(10,10,10,0.10)]"
      >
        {/* Photo */}
        {/* Mobile: contenedor cuadrado con la foto COMPLETA (object-contain,
            sin recorte) más chica en un área inset — el botón + vive en el
            margen superior sin pisarla. Desktop: la foto llena la card 4:5. */}
        <Link
          href={productHref}
          data-cms-el="card-image"
          style={cardImageStyleProp}
          className="relative block aspect-[6/7] w-full overflow-hidden bg-white sm:aspect-[4/5]"
          aria-label={`Ver ${product.name}`}
        >
          <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center px-6 text-center font-black uppercase tracking-tight text-line">
            {product.name}
          </span>
          {cover && (
            <div className="absolute inset-x-2 bottom-1 top-9 sm:inset-0">
              <Image
                key={cover}
                src={cover}
                alt={product.name}
                fill
                // Lazy (default): las cards están debajo del hero. next/image
                // pide un tamaño acorde al ancho real de la card.
                sizes="(max-width: 640px) 90vw, 25vw"
                className={`object-contain object-center transition-transform duration-300 ease-out sm:object-cover ${
                  allOutOfStock ? "opacity-40 grayscale" : "group-hover:scale-105"
                }`}
              />
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3 sm:gap-1.5">
            {!allOutOfStock && selPromoType && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-promo-bg px-1.5 py-0.5 font-black uppercase tracking-wide text-[9px] text-badge-promo-text shadow-md sm:px-3 sm:py-1.5 sm:tracking-widest sm:text-sm">
                {selPromoType}
              </span>
            )}
            {!allOutOfStock && selPromoPercent > 0 && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-promo-bg px-1.5 py-0.5 font-black uppercase tracking-wide text-[9px] text-badge-promo-text shadow-md sm:px-3 sm:py-1.5 sm:tracking-widest sm:text-sm">
                -{selPromoPercent}%
              </span>
            )}
            {product.isNew && !allOutOfStock && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-new-bg px-1.5 py-0.5 font-bold uppercase tracking-wide text-[9px] text-badge-new-text sm:px-2.5 sm:py-1 sm:tracking-widest sm:text-[10px]">
                {newLabel}
              </span>
            )}
            {allOutOfStock && (
              <span data-cms-style="badge" style={badgeStyle} className="bg-badge-stock-bg px-1.5 py-0.5 font-bold uppercase tracking-wide text-[9px] text-badge-stock-text sm:px-2.5 sm:py-1 sm:tracking-widest sm:text-[10px]">
                {outOfStockLabel}
              </span>
            )}
          </div>
        </Link>

        {/* Botón + (solo mobile), esquina superior derecha estilo CRAV: abre
            el mismo panel glass que el hover de desktop. Abierto muta a ×. */}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          disabled={allOutOfStock}
          aria-label={allOutOfStock ? outOfStockLabel : addToCartLabel}
          aria-expanded={panelOpen}
          data-cms-button="catalog.add"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-2xl font-bold leading-none text-white shadow-[0_10px_25px_rgba(10,10,10,0.3)] transition-transform duration-200 active:scale-90 disabled:bg-muted sm:hidden"
        >
          <span
            key={`${justAdded}-${panelOpen}`}
            className={justAdded ? "inline-block animate-counter-pop" : "inline-block"}
          >
            {justAdded ? "✓" : panelOpen ? "×" : "+"}
          </span>
        </button>

        {/* Cuerpo estilo CRAV en desktop: solo nombre + precio web en una fila.
            El resto (empanados, precio efectivo, CTA) vive en el panel glass
            que aparece al hover. En mobile queda el layout de siempre. */}
        <div className="flex min-w-0 flex-1 flex-col px-4 pb-3.5 pt-1 sm:px-5 sm:pb-7 sm:pt-2">
          {/* Desktop: nombre izq + precio der en la misma fila. items-baseline
              alinea el precio con la PRIMERA línea del nombre, así queda a la
              misma altura en todas las cards (tengan nombre de 1 o 2 líneas)
              sin reservar altura fija; la altura total la iguala el grid. */}
          {/* Desktop: nombre y precio CENTRADOS, precio debajo. El bloque del
              nombre reserva SIEMPRE el alto de 2 líneas (centrando el texto
              vertical adentro), así los nombres largos no desproporcionan las
              cards y el precio queda a la misma altura en toda la fila. Se
              esconde al toque cuando entra el panel glass. */}
          {/* Mobile: fila CRAV — nombre abajo-izquierda, precio abajo-derecha.
              Se esconde cuando el panel glass está abierto (mobile) o al hover
              (desktop). */}
          <div
            className={`flex min-w-0 items-baseline justify-between gap-3 transition-opacity duration-100 sm:block sm:text-center sm:group-hover:opacity-0 ${
              panelOpen ? "opacity-0" : ""
            }`}
          >
            <Link
              href={productHref}
              className="min-w-0 sm:flex sm:h-[2.6rem] sm:items-start sm:justify-center"
            >
              <h3
                data-cms-style="name"
                data-cms-el="card-title"
                style={{ ...nameStyle, ...cardTitleStyleProp }}
                className="break-words font-black uppercase tracking-tight text-lg leading-tight text-product-name transition-colors hover:text-muted sm:line-clamp-2 sm:text-lg"
              >
                {product.name}
              </h3>
            </Link>
            {/* Precio web mobile — texto plano bold, a la derecha */}
            <p
              data-cms-style="price"
              style={priceStyle}
              className="shrink-0 font-black text-xl leading-none tabular-nums text-price sm:hidden"
            >
              {formatPrice(webShown)}
            </p>
            {/* Precio web desktop — pastilla tinta con sombra */}
            <p
              data-cms-style="price"
              data-cms-element="card-web-price-badge"
              style={priceStyle}
              className="mt-3 hidden rounded-full bg-ink px-8 py-3 font-black text-3xl leading-none tabular-nums text-white shadow-[0_10px_25px_rgba(10,10,10,0.22)] sm:inline-block"
            >
              {formatPrice(webShown)}
            </p>
          </div>

        </div>

        {/* Panel liquid glass — solo desktop. Invisible hasta hover (o foco de
            teclado en sus controles); flota sobre la parte baja de la card con
            los empanados, el precio efectivo/transf y el CTA. pointer-events
            apagado mientras está oculto para no tapar el link de la imagen. */}
        {/* transition-transform (no -all): la opacidad cambia INSTANTÁNEA al
            hover — el panel tapa la imagen de una — y solo el deslizamiento
            se anima. */}
        <div
          className={`absolute inset-x-3 bottom-3 z-10 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            panelOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          } sm:focus-within:pointer-events-auto sm:focus-within:translate-y-0 sm:focus-within:opacity-100 sm:group-hover:pointer-events-auto sm:group-hover:translate-y-0 sm:group-hover:opacity-100`}
        >
          <div className="rounded-2xl border border-white/40 bg-white/55 p-4 shadow-[0_18px_45px_rgba(10,10,10,0.18)] backdrop-blur-xl">
            {/* Peso del paquete — píldora tinta, a juego con la del precio */}
            <p className="mb-2.5 inline-block rounded-full bg-ink px-3.5 py-1.5 font-black uppercase tracking-[0.18em] text-xs text-white">
              {formatWeight(product.weightGrams)}
            </p>
            {hasMultipleBreadcrumbs && (
              <div>
                <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
                  {chooseBreadcrumbLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.breadcrumbs.map((code) => {
                    const active = code === selected;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelected(code)}
                        aria-pressed={active}
                        data-cms-style="empanado"
                        style={{
                          borderRadius: "var(--empanado-radius, 9999px)",
                          fontFamily: "var(--empanado-font, inherit)",
                          fontWeight: "var(--empanado-weight, 700)" as React.CSSProperties["fontWeight"],
                          textTransform: "var(--empanado-transform, uppercase)" as React.CSSProperties["textTransform"],
                        }}
                        className={`border border-empanado-border px-3 py-1.5 font-bold uppercase tracking-wide text-xs transition-all duration-200 ${
                          active
                            ? "bg-empanado-active-bg text-empanado-active-text shadow-sm"
                            : "bg-empanado-inactive-bg/80 text-empanado-inactive-text hover:bg-cream"
                        }`}
                      >
                        {BREADCRUMB_LABELS[code] ?? code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Precio efectivo/transferencia (o el % OFF global de fallback) */}
            {showCashPrice ? (
              <p className={`flex items-baseline justify-between gap-2 ${hasMultipleBreadcrumbs ? "mt-3" : ""}`}>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Efectivo o transferencia
                </span>
                <span className="font-black text-lg tabular-nums text-price">
                  {formatPrice(cashShown)}
                </span>
              </p>
            ) : payDiscountPct > 0 ? (
              <p className={`flex items-baseline gap-1.5 ${hasMultipleBreadcrumbs ? "mt-3" : ""}`}>
                <span
                  data-cms-style="chip"
                  style={chipStyle}
                  className="inline-flex items-baseline border border-chip-border bg-chip-bg px-2 py-0.5 font-black text-xs text-chip-text"
                >
                  {payDiscountPct}% OFF
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  {paymentCashLabel} o {paymentTransferLabel}
                </span>
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedOutOfStock || selectedAtLimit}
              data-cms-style="button"
              data-cms-button="catalog.add"
              style={{ ...primaryBtnStyle, ...addButtonStyle }}
              className="mt-3 w-full overflow-hidden bg-button px-4 py-3 font-bold uppercase tracking-widest text-sm text-button-text shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0 disabled:hover:bg-muted"
            >
              {selectedOutOfStock
                ? outOfStockLabel
                : selectedAtLimit
                ? selectedLowStockLabel
                : justAdded
                ? addedLabel
                : addToCartLabel}
            </button>

            <Link
              href={productHref}
              data-cms-style="button2"
              data-cms-button="catalog.detail"
              style={{
                fontFamily: "var(--btn2-font, inherit)",
                fontWeight:
                  "var(--btn2-weight, 700)" as React.CSSProperties["fontWeight"],
                textTransform:
                  "var(--btn2-transform, uppercase)" as React.CSSProperties["textTransform"],
                textDecoration: "var(--btn2-underline, none)",
                ...detailButtonStyle,
              }}
              className="mt-2.5 block text-center font-bold uppercase tracking-widest text-[11px] text-button-secondary-text underline-offset-4 hover:underline"
            >
              {viewDetailLabel}
            </Link>
          </div>
        </div>
      </article>

    </>
  );
}
