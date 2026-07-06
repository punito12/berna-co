"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import BernaLogo from "@/components/BernaLogo";

// Header de páginas internas (detalle de producto), estilo CRAV como el del
// home: sin barra de fondo — logo a la izquierda y dos píldoras flotantes a la
// derecha, tirados a las esquinas. Siempre visible (acá no hay hero que tapar).
// pointer-events-none en el contenedor para no bloquear clicks del contenido.
export default function SiteHeader({
  productsLabel = "Productos",
  cartLabel = "Carrito",
}: {
  logoUrl?: string;
  productsLabel?: string;
  cartLabel?: string;
}) {
  const { totalItems } = useCart();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3 sm:px-7 sm:py-4">
        {/* Mismo logo oscuro por defecto que el header del home (el logoUrl
            del CMS es la variante clara y no se ve sobre fondo crema). */}
        <Link href="/" aria-label="Inicio" className="pointer-events-auto">
          <BernaLogo variant="dark" size="sm" className="!h-14" />
        </Link>
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/#productos"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.25)] transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {productsLabel}
          </Link>
          <Link
            href="/checkout"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white/85 px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-ink shadow-[0_10px_30px_rgba(10,10,10,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {cartLabel}
            <span
              key={totalItems}
              className="animate-counter-pop inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] text-white shadow-sm"
            >
              {totalItems}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
