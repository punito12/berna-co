"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BernaLogo from "@/components/BernaLogo";

// Top-level admin sections. Sub-tabs (Ventas, Facturación) live inside each page.
const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/caja", label: "Caja" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/facturacion", label: "Facturación" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/rentabilidad", label: "Rentabilidad" },
  { href: "/admin/entregas", label: "Entregas" },
  { href: "/admin/newsletter", label: "Newsletter" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    // Facturación owns the Barrios sub-route.
    if (href === "/admin/facturacion")
      return pathname.startsWith("/admin/facturacion") || pathname.startsWith("/admin/barrios");
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
          >
            {/* hamburger */}
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-white" />
              <span className="block h-0.5 w-5 bg-white" />
              <span className="block h-0.5 w-5 bg-white" />
            </span>
            Menú
          </button>

          <Link href="/admin">
            <BernaLogo variant="light" size="sm" />
          </Link>

          <button
            type="button"
            onClick={logout}
            className="font-bold uppercase tracking-widest text-[11px] text-cream hover:text-white"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Drawer + backdrop */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <nav className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-ink text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-black uppercase tracking-widest text-sm">
                Panel
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-2xl leading-none text-cream hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-5 py-3 font-bold uppercase tracking-wide text-sm transition-colors ${
                    isActive(link.href)
                      ? "bg-white text-ink"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={logout}
              className="border-t border-white/10 px-5 py-4 text-left font-bold uppercase tracking-widest text-[11px] text-cream hover:text-white"
            >
              Salir
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
