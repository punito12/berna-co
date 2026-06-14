// Registro tipado del Editor Visual (estilo Tiendanube). Es la única fuente de
// verdad de qué páginas y secciones existen en el editor visual, organizadas
// como las ve el dueño en el sitio público (no por keys internas del CMS).
//
// Phase 0/1: el registro describe páginas y secciones para SELECCIÓN y vista
// previa. Los controles editables reales se conectan en fases siguientes
// (reutilizando el CMS actual). NO cambia el sitio público ni la DB.

// Grupos de edición que tendrá cada sección cuando se conecten los controles
// (Phase 2+). Acá solo se declaran para diseñar la estructura final.
export type CmsVisualGroup =
  | "content" // textos
  | "image" // imágenes
  | "style" // colores/tipografías/bordes
  | "mobile" // ajustes solo de celular
  | "advanced"; // controles técnicos

// Estado de mapeo de la sección en el editor visual:
//  - ready:   sección entendida y lista para conectar controles
//  - partial: sección reconocida, mapeo parcial
//  - planned: pendiente de mapear en una fase futura
export type CmsVisualStatus = "ready" | "partial" | "planned";

export type CmsVisualSection = {
  id: string;
  label: string;
  /** id de la página a la que pertenece */
  page: string;
  description: string;
  /** Nombre de marcador (data-cms-section) para el click-to-edit de Phase 2. */
  marker?: string;
  /** Ancla pública existente (#id) para desplazar la vista previa. */
  anchor?: string;
  status: CmsVisualStatus;
  groups: CmsVisualGroup[];
  /** Link al CMS actual (Modo avanzado) donde HOY se edita esta sección. */
  advancedHref?: string;
};

export type CmsVisualPage = {
  id: string;
  label: string;
  description: string;
  /**
   * Ruta pública a mostrar en la vista previa (iframe). El editor le agrega
   * `?preview=<token>` para ver el borrador. Si es undefined, todavía no hay
   * vista previa para esa página (se conecta en una fase futura).
   *
   * Para "producto" se resuelve en runtime con el slug del primer producto;
   * por eso acá queda undefined y el componente arma la URL.
   */
  previewPath?: string;
  /** true si la vista previa necesita el slug de un producto real (detalle). */
  needsProductSlug?: boolean;
  status: CmsVisualStatus;
  sections: CmsVisualSection[];
};

// ---- Home: la página mejor mapeada en Phase 1 -----------------------------

const HOME_SECTIONS: CmsVisualSection[] = [
  {
    id: "global.top-banner",
    label: "Banner superior",
    page: "home",
    description:
      "Aviso superior de descuento por cantidad. Hoy se arma solo con los tramos de “Descuento por cantidad de unidades”.",
    marker: "global.top-banner",
    status: "partial",
    groups: ["content", "advanced"],
    advancedHref: "/admin/ventas/promociones",
  },
  {
    id: "global.header",
    label: "Header",
    page: "home",
    description:
      "Logo y navegación superior del sitio. El logo se edita en Marca y estilos.",
    marker: "global.header",
    // En la Home, la portada ya incluye el logo: el header no es una sección
    // independiente editable todavía → queda en "Pendiente de conectar".
    status: "planned",
    groups: ["image", "content", "style"],
    advancedHref: "/admin/editor/identidad",
  },
  {
    id: "home.hero",
    label: "Portada",
    page: "home",
    description:
      "Título principal, subtítulo, imagen de fondo y botón de la portada.",
    marker: "home.hero",
    status: "partial",
    groups: ["content", "image", "style", "mobile", "advanced"],
    advancedHref: "/admin/editor/home",
  },
  {
    id: "home.products",
    label: "Productos",
    page: "home",
    description:
      "Bajada, título y subtítulo de la grilla de productos del inicio.",
    marker: "home.products",
    anchor: "productos",
    status: "partial",
    groups: ["content", "style", "advanced"],
    advancedHref: "/admin/editor/catalogo",
  },
  {
    id: "home.ingredients",
    label: "Ingredientes",
    page: "home",
    description: "Bajada, título y tarjetas de “Nuestros ingredientes”.",
    marker: "home.ingredients",
    anchor: "ingredientes",
    status: "partial",
    groups: ["content", "style"],
    advancedHref: "/admin/editor/ingredientes",
  },
  {
    id: "home.trust",
    label: "Confianza / Cómo comprar",
    page: "home",
    description:
      "Bloques de confianza y “cómo comprar” (envíos, pagos, conservación).",
    marker: "home.trust",
    status: "planned",
    groups: ["content", "style"],
    advancedHref: "/admin/editor/confianza",
  },
  {
    id: "global.footer",
    label: "Footer",
    page: "home",
    description: "Contacto, redes, slogan y links del pie de página.",
    marker: "global.footer",
    status: "partial",
    groups: ["content", "style"],
    advancedHref: "/admin/editor/footer",
  },
];

// ---- Elementos globales (aparecen en todo el sitio) -----------------------

const GLOBAL_SECTIONS: CmsVisualSection[] = [
  {
    id: "global.logo",
    label: "Logo y marca",
    page: "global",
    description: "Logo del sitio. Colores y tipografías van en Marca y estilos.",
    status: "partial",
    groups: ["image", "style"],
    advancedHref: "/admin/editor/identidad",
  },
  {
    id: "global.whatsapp",
    label: "WhatsApp",
    page: "global",
    description: "Botón flotante de WhatsApp del negocio.",
    marker: "global.whatsapp",
    status: "partial",
    groups: ["content"],
    advancedHref: "/admin/config/negocio",
  },
  {
    id: "global.footer",
    label: "Footer / contacto",
    page: "global",
    description: "Contacto, redes y datos del pie de página.",
    marker: "global.footer",
    status: "partial",
    groups: ["content"],
    advancedHref: "/admin/editor/footer",
  },
  {
    id: "global.newsletter",
    label: "Newsletter",
    page: "global",
    description: "Título, texto y botón de la suscripción del pie.",
    status: "partial",
    groups: ["content"],
    advancedHref: "/admin/editor/footer",
  },
  {
    id: "global.nav",
    label: "Navegación",
    page: "global",
    description: "Links del header (Productos, Carrito).",
    status: "planned",
    groups: ["content"],
    advancedHref: "/admin/editor/catalogo",
  },
  {
    id: "global.legal",
    label: "Links legales",
    page: "global",
    description: "Términos, privacidad, envíos y cambios.",
    status: "planned",
    groups: ["content"],
    advancedHref: "/admin/editor/legales",
  },
];

// ---- Páginas del editor visual --------------------------------------------
// Home está completa; el resto aparece en el selector con su vista previa
// cuando existe una URL pública, y como "planned" cuando se mapea más adelante.

export const CMS_VISUAL_PAGES: CmsVisualPage[] = [
  {
    id: "home",
    label: "Home",
    description:
      "Página de inicio: portada, productos, ingredientes y secciones visibles.",
    previewPath: "/",
    status: "partial",
    sections: HOME_SECTIONS,
  },
  {
    id: "global",
    label: "Global",
    description:
      "Elementos que aparecen en todo el sitio: logo, footer, WhatsApp y más.",
    previewPath: "/",
    status: "partial",
    sections: GLOBAL_SECTIONS,
  },
  {
    id: "catalogo",
    label: "Catálogo",
    description: "Grilla de productos, filtros y textos de las tarjetas.",
    previewPath: "/#productos",
    status: "partial",
    sections: [
      {
        id: "catalog.header",
        label: "Encabezado del catálogo",
        page: "catalogo",
        description: "Bajada, título y subtítulo de la sección de productos.",
        marker: "catalog.header",
        anchor: "productos",
        status: "partial",
        groups: ["content", "style"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "catalog.filters",
        label: "Filtros",
        page: "catalogo",
        description: "Texto del filtro general. Las categorías vienen de los productos.",
        marker: "catalog.filters",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/productos",
      },
      {
        id: "catalog.cards",
        label: "Tarjetas de producto",
        page: "catalogo",
        description: "Textos de las tarjetas (agregar, ver detalle, stock…).",
        marker: "catalog.cards",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/productos",
      },
      {
        id: "catalog.purchase",
        label: "Textos de compra",
        page: "catalogo",
        description: "Selector de empanado y etiquetas de formas de pago.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/config/metodos-pago",
      },
      {
        id: "catalog.cart",
        label: "Barra de carrito",
        page: "catalogo",
        description: "Textos de la barra de carrito que aparece al sumar productos.",
        marker: "catalog.cart",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
    ],
  },
  {
    id: "producto",
    label: "Detalle de producto",
    description:
      "Página de un producto: galería, descripción, empanado y panel de compra.",
    needsProductSlug: true,
    status: "planned",
    sections: [],
  },
  {
    id: "checkout",
    label: "Checkout",
    description: "Pasos de finalizar compra: datos, entrega, pago y resumen.",
    previewPath: "/checkout",
    status: "planned",
    sections: [],
  },
  {
    id: "pedido-confirmado",
    label: "Pedido confirmado",
    description: "Pantalla de confirmación del pedido.",
    previewPath: "/pedido/confirmado",
    status: "planned",
    sections: [],
  },
  {
    id: "pedido-transferencia",
    label: "Pedido transferencia",
    description: "Instrucciones de pago por transferencia.",
    previewPath: "/pedido/transferencia",
    status: "planned",
    sections: [],
  },
  {
    id: "pedido-pendiente",
    label: "Pedido pendiente",
    description: "Pantalla de pago pendiente.",
    previewPath: "/pedido/pendiente",
    status: "planned",
    sections: [],
  },
  {
    id: "pedido-error",
    label: "Pedido error",
    description: "Pantalla de error de pago.",
    previewPath: "/pedido/error",
    status: "planned",
    sections: [],
  },
  {
    id: "confianza",
    label: "Confianza",
    description: "Cómo comprar, envíos, preguntas frecuentes y conservación.",
    previewPath: "/confianza",
    status: "planned",
    sections: [],
  },
  {
    id: "ingredientes",
    label: "Ingredientes",
    description: "Páginas de detalle de cada ingrediente.",
    previewPath: "/ingredientes/huevos",
    status: "planned",
    sections: [],
  },
  {
    id: "legales",
    label: "Legales",
    description: "Términos, privacidad, envíos y cambios/devoluciones.",
    previewPath: "/terminos",
    status: "planned",
    sections: [],
  },
  {
    id: "seo",
    label: "SEO / compartir",
    description:
      "Título, descripción e imagen para Google y redes. Se edita en Modo avanzado.",
    status: "planned",
    sections: [],
  },
  {
    id: "marca",
    label: "Marca visual",
    description:
      "Colores, tipografías, botones y tarjetas. Se edita en Modo avanzado.",
    previewPath: "/",
    status: "planned",
    sections: [],
  },
];

export function findVisualPage(id: string): CmsVisualPage | undefined {
  return CMS_VISUAL_PAGES.find((p) => p.id === id);
}

export const VISUAL_STATUS_LABEL: Record<CmsVisualStatus, string> = {
  ready: "Listo",
  partial: "Parcial",
  planned: "Próximamente",
};

export const VISUAL_GROUP_LABEL: Record<CmsVisualGroup, string> = {
  content: "Textos",
  image: "Imágenes",
  style: "Estilo",
  mobile: "Celular",
  advanced: "Avanzado",
};
