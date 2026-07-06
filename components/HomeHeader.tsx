"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BernaLogo from "@/components/BernaLogo";
import { useCart } from "@/components/CartProvider";

// Header público del home: invisible sobre el hero (que ya lleva la marca).
// Patrón "reveal on scroll-up" (como CRAV): pasado el hero, aparece cuando
// scrolleás hacia ARRIBA y se esconde deslizándose cuando bajás. Solo
// transform; listener de scroll con rAF (barato).
const FILTER_OPTIONS: { code: string; label: string }[] = [
  { code: "ALL", label: "Todos" },
  { code: "CARNE", label: "Carne" },
  { code: "POLLO", label: "Pollo" },
  { code: "CERDO", label: "Cerdo" },
  { code: "VEGANO", label: "Veggie" },
];

// variant "home": invisible sobre el hero, aparece al scrollear arriba pasado
// el hero. variant "page" (producto/ingredientes): visible al tope y mismo
// reveal-on-scroll-up después.
export default function HomeHeader({
  variant = "home",
  productsLabel = "Productos",
  cartLabel = "Carrito",
  filterLabels,
}: {
  variant?: "home" | "page";
  productsLabel?: string;
  cartLabel?: string;
  /** Labels de los cortes del header (por código de categoría). */
  filterLabels?: Record<string, string>;
}) {
  const { totalItems } = useCart();
  const [visible, setVisible] = useState(variant === "page");

  // Filtros del catálogo en el header: solo se muestran mientras el DISPLAY
  // (la zona de cards, no el bloque "nuestros productos") está en pantalla.
  // Estado sincronizado con Catalog por eventos.
  const [inCatalog, setInCatalog] = useState(false);
  // Los cortes recién aparecen cuando la cápsula fija de filtros del display
  // ya quedó ARRIBA del viewport (scrolleaste más abajo de ella) — nunca en
  // "nuestros productos" ni mientras la cápsula está a la vista.
  const [pastFilters, setPastFilters] = useState(false);
  const [category, setCategory] = useState("ALL");
  useEffect(() => {
    const section = document.getElementById("display");
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => setInCatalog(entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0.05 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const el = document.getElementById("display-filters");
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) =>
        setPastFilters(
          !entry.isIntersecting && entry.boundingClientRect.top < 0
        ),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    function onCategory(e: Event) {
      const code = (e as CustomEvent<string>).detail;
      if (typeof code === "string") setCategory(code);
    }
    window.addEventListener("berna:category", onCategory);
    return () => window.removeEventListener("berna:category", onCategory);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        // Umbral chico para ignorar el jitter del trackpad.
        if (Math.abs(delta) > 4) {
          setVisible(
            variant === "page"
              ? y < 80 || delta < 0
              : y > window.innerHeight * 0.7 && delta < 0
          );
          lastY = y;
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  return (
    // Header CRAV-style: sin barra de fondo — el logo y dos píldoras flotantes
    // tirados a las esquinas. pointer-events-none en el contenedor para que el
    // espacio vacío del medio no tape clicks del contenido.
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0" : "-translate-y-[130%]"
      }`}
    >
      {/* Mobile: barra liquid glass con SOLO el logo centrado. Desktop: sin
          barra, logo izquierda + píldoras derecha (como CRAV). */}
      <div className="relative flex items-center justify-center border-b border-line bg-white/92 px-4 py-2.5 backdrop-blur-xl sm:justify-between sm:border-0 sm:bg-transparent sm:px-7 sm:py-4 sm:backdrop-blur-none">
        <Link href="/" aria-label="Inicio" className="pointer-events-auto">
          <BernaLogo variant="dark" size="sm" className="!h-10 w-auto sm:!h-14" />
        </Link>

        {/* Filtros del catálogo — centrados, SOLO mientras la sección
            #productos está en viewport. */}
        {inCatalog && pastFilters && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-line bg-white/85 p-1.5 shadow-[0_10px_30px_rgba(10,10,10,0.15)] backdrop-blur-xl lg:flex">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("berna:set-category", {
                      detail: opt.code,
                    })
                  )
                }
                aria-pressed={category === opt.code}
                className={`rounded-full px-4 py-2 font-bold uppercase tracking-widest text-xs transition-colors duration-200 ${
                  category === opt.code
                    ? "bg-ink text-white"
                    : "text-ink hover:bg-ink/10"
                }`}
              >
                {filterLabels?.[opt.code] ?? opt.label}
              </button>
            ))}
          </div>
        )}
        {/* Píldoras solo en desktop (en mobile el carrito es el FAB) */}
        <div className="pointer-events-auto hidden items-center sm:flex sm:gap-3">
          <a
            href="/#productos"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.25)] transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {productsLabel}
          </a>
          {/* Abre el panel flotante del carrito (CartOverlay escucha este
              evento), no navega al checkout. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("berna:cart-open"))}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white/85 px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-ink shadow-[0_10px_30px_rgba(10,10,10,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {cartLabel}
            <span
              key={totalItems}
              className="animate-counter-pop inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] text-white shadow-sm"
            >
              {totalItems}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
