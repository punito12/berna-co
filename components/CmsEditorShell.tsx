"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import EditorStatusBar from "@/components/EditorStatusBar";

const EDITOR_NAV = [
  {
    href: "/admin/editor/home",
    label: "Inicio",
    description: "Hero, secciones y contenido principal",
  },
  {
    href: "/admin/editor/catalogo",
    label: "Productos",
    description: "Grilla, cards, filtros y textos de venta",
  },
  {
    href: "/admin/editor/ingredientes",
    label: "Ingredientes",
    description: "Cards del inicio y páginas de detalle",
  },
  {
    href: "/admin/editor/checkout",
    label: "Finalizar compra",
    description: "Pasos, ayuda, entrega, pago y mensajes",
  },
  {
    href: "/admin/editor/confianza",
    label: "Confianza",
    description: "Cómo comprar, envíos, FAQ y conservación",
  },
  {
    href: "/admin/editor/legales",
    label: "Legales",
    description: "Términos, privacidad, envíos y cambios",
  },
  {
    href: "/admin/editor/identidad",
    label: "Marca y estilos",
    description: "Logo, colores, tipografías y previews",
  },
  {
    href: "/admin/editor/seo",
    label: "SEO y compartir",
    description: "Google, WhatsApp y redes sociales",
  },
  {
    href: "/admin/editor/footer",
    label: "Pie de página",
    description: "Contacto, redes y links del footer",
  },
];

function currentSection(pathname: string) {
  return (
    EDITOR_NAV.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) ?? EDITOR_NAV[0]
  );
}

export default function CmsEditorShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = currentSection(pathname);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-cream/55 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted">
            Editor del sitio
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-black uppercase tracking-tight text-3xl leading-none text-ink sm:text-4xl">
                {current.label}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {current.description}. Todo lo que edites queda como borrador
                hasta que lo publiques.
              </p>
            </div>
            <Link
              href="/"
              target="_blank"
              className="rounded-full border border-line bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-ink transition-colors hover:border-ink"
            >
              Ver sitio público
            </Link>
          </div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <nav
            aria-label="Secciones del editor"
            className="border-b border-line bg-white p-3 lg:border-b-0 lg:border-r"
          >
            <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
              {EDITOR_NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block min-w-[180px] rounded-xl px-4 py-3 transition-colors lg:min-w-0 ${
                      active
                        ? "bg-ink text-white"
                        : "text-ink hover:bg-cream"
                    }`}
                  >
                    <span className="block text-sm font-black uppercase tracking-wide">
                      {item.label}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${
                        active ? "text-white/70" : "text-muted"
                      }`}
                    >
                      {item.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="min-w-0 p-4 sm:p-5">
            <EditorStatusBar />
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </header>
    </div>
  );
}
