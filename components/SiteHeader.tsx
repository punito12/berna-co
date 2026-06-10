"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import BernaLogo from "@/components/BernaLogo";

// Slim light header used on inner pages (e.g. product detail): brand on the
// left, a back link and a live cart count on the right.
export default function SiteHeader({
  logoUrl = "",
  productsLabel = "Productos",
  cartLabel = "Carrito",
}: {
  logoUrl?: string;
  productsLabel?: string;
  cartLabel?: string;
}) {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <Link href="/" aria-label="Inicio">
        <BernaLogo variant="dark" size="sm" src={logoUrl} />
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/#productos"
          className="px-2 py-2 font-bold uppercase tracking-widest text-xs text-ink transition-colors hover:text-muted"
        >
          {productsLabel}
        </Link>
        <Link
          href="/checkout"
          className="flex items-center gap-2 px-2 py-2 font-bold uppercase tracking-widest text-xs text-ink transition-colors hover:text-muted"
        >
          {cartLabel}
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] text-white shadow-sm">
            {totalItems}
          </span>
        </Link>
      </div>
      </div>
    </header>
  );
}
