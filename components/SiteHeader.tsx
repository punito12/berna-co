"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import BernaLogo from "@/components/BernaLogo";

// Slim light header used on inner pages (e.g. product detail): brand on the
// left, a back link and a live cart count on the right.
export default function SiteHeader() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
      <Link href="/" aria-label="Inicio">
        <BernaLogo variant="dark" size="sm" />
      </Link>

      <div className="flex items-center gap-4">
        <Link
          href="/#productos"
          className="font-bold uppercase tracking-widest text-xs text-ink hover:text-muted"
        >
          Productos
        </Link>
        <Link
          href="/checkout"
          className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-ink"
        >
          Carrito
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] text-white">
            {totalItems}
          </span>
        </Link>
      </div>
    </header>
  );
}
