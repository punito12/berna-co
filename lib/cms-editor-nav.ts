// Single source of truth for the site editor navigation. Owner-friendly labels
// organized around what the owner sees on the website (not internal CMS keys).
// CmsEditorShell renders this; keep routes in sync with app/admin/(panel)/editor.

export type CmsEditorNavItem = {
  href: string;
  label: string;
  description: string;
};

export const CMS_EDITOR_NAV: CmsEditorNavItem[] = [
  {
    href: "/admin/editor/home",
    label: "Inicio",
    description: "Portada, banner superior y secciones del inicio",
  },
  {
    href: "/admin/editor/catalogo",
    label: "Productos",
    description: "Textos del catálogo, tarjetas y etiquetas de pago",
  },
  {
    href: "/admin/editor/ingredientes",
    label: "Ingredientes",
    description: "Tarjetas del inicio y páginas de detalle",
  },
  {
    href: "/admin/editor/checkout",
    label: "Finalizar compra",
    description: "Textos del carrito, envío/retiro, pagos y pedido",
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

// Returns the nav item matching the current pathname (exact or nested), falling
// back to the first section.
export function currentCmsEditorSection(pathname: string): CmsEditorNavItem {
  return (
    CMS_EDITOR_NAV.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) ?? CMS_EDITOR_NAV[0]
  );
}
