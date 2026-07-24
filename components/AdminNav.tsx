"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BernaLogo from "@/components/BernaLogo";

// Navegación del admin, agrupada por función. Reorganizada para Admin V2:
// se separa OPERAR (día a día) de ANALIZAR (reportes), y se agrupa el catálogo
// (productos, stock, precios, promos) en un solo lugar.
//
// Notas de arquitectura:
//  - Cada href apunta a una página real y viva (verificado). Las rutas legacy
//    (/admin/pedidos, /admin/facturacion, /admin/facturacion/barrios, /admin/editor)
//    siguen existiendo SOLO como redirects; no se linkean acá.
//  - NO se linkea Caja, Compras ni Proveedores (deshabilitados a propósito).
//  - Secciones con sub-navegación propia (Costos y Precios → SubTabs; Stock →
//    SubTabs Inventario/Movimientos; Editor del sitio → CmsEditorShell) se linkean
//    por su ENTRADA; el resto se navega adentro. Así el menú queda corto y claro.
const SECTIONS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Inicio",
    links: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    title: "Operaciones",
    links: [
      { href: "/admin/operaciones/ventas", label: "Pedidos y ventas" },
      { href: "/admin/entregas", label: "Entregas" },
      { href: "/admin/ventas", label: "Cargar venta manual" },
      { href: "/admin/remitos", label: "Remitos" },
      { href: "/admin/operaciones/presupuestos", label: "Presupuestos" },
    ],
  },
  {
    title: "Análisis",
    links: [
      { href: "/admin/operaciones/resumen-ventas", label: "Resumen de ventas" },
      { href: "/admin/operaciones/inteligencia-comercial", label: "Inteligencia Comercial" },
      { href: "/admin/analytics", label: "Analytics web" },
    ],
  },
  {
    title: "Clientes",
    links: [
      { href: "/admin/clientes", label: "Lista de clientes" },
      { href: "/admin/potenciales", label: "Puntos potenciales" },
      { href: "/admin/clientes/barrios", label: "Barrios y localidades" },
    ],
  },
  {
    title: "Catálogo",
    links: [
      { href: "/admin/productos", label: "Productos" },
      { href: "/admin/stock", label: "Stock" },
      { href: "/admin/catalogo/costos", label: "Costos y Precios" },
      { href: "/admin/ventas/promociones", label: "Promociones" },
      { href: "/admin/catalogo/codigos", label: "Cupones de descuento" },
    ],
  },
  {
    title: "Marketing",
    links: [{ href: "/admin/newsletter", label: "Suscriptores" }],
  },
  {
    title: "Sitio web",
    links: [
      { href: "/admin/editor/contenido", label: "Editor del sitio" },
    ],
  },
  {
    title: "Configuración",
    links: [
      { href: "/admin/config/envios", label: "Envíos y localidades" },
      { href: "/admin/config/zonas", label: "Zonas de entrega" },
      { href: "/admin/config/horarios", label: "Días y horarios" },
      { href: "/admin/config/metodos-pago", label: "Métodos de pago" },
      { href: "/admin/config/negocio", label: "Datos del negocio" },
    ],
  },
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

  // Active when the path matches this link AND no other (longer) link is a
  // better match — so /admin/ventas/promociones lights "Promociones", not
  // "Cargar venta manual" (/admin/ventas).
  const ALL_HREFS = SECTIONS.flatMap((s) => s.links.map((l) => l.href));
  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (!(pathname === href || pathname.startsWith(href + "/"))) return false;
    // Reject if a more specific sibling link matches the path better.
    const better = ALL_HREFS.some(
      (h) =>
        h !== href &&
        h.length > href.length &&
        (pathname === h || pathname.startsWith(h + "/"))
    );
    return !better;
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
              {SECTIONS.map((section) => (
                <div key={section.title} className="mb-1">
                  <p className="px-5 pb-1 pt-3 font-bold uppercase tracking-widest text-[10px] text-cream/60">
                    {section.title}
                  </p>
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-5 py-2.5 font-bold uppercase tracking-wide text-[13px] transition-colors ${
                        isActive(link.href)
                          ? "bg-white text-ink"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
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
