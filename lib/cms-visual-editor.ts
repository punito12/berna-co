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
  /**
   * Ruta pública propia para previsualizar al seleccionar esta sección (ej.
   * cada página legal tiene su propia URL). Si está, el editor navega el iframe
   * a esta ruta; si no, usa la de la página.
   */
  previewPath?: string;
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
    label: "Inicio",
    description: "Portada y secciones principales.",
    previewPath: "/",
    status: "partial",
    sections: HOME_SECTIONS,
  },
  {
    id: "global",
    label: "Global",
    description: "Logo, footer, WhatsApp y elementos del sitio.",
    previewPath: "/",
    status: "partial",
    sections: GLOBAL_SECTIONS,
  },
  {
    id: "catalogo",
    label: "Catálogo",
    description: "Grilla, filtros y tarjetas.",
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
    description: "Página individual de producto.",
    needsProductSlug: true,
    status: "partial",
    sections: [
      {
        id: "product.back",
        label: "Volver / navegación",
        page: "producto",
        description: "Texto del link “Volver a productos”.",
        marker: "product.back",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "product.gallery",
        label: "Galería e imagen",
        page: "producto",
        description: "Fotos del producto. Se editan en Admin → Productos.",
        marker: "product.gallery",
        status: "planned",
        groups: ["image"],
        advancedHref: "/admin/productos",
      },
      {
        id: "product.info",
        label: "Información del producto",
        page: "producto",
        description: "Nombre, precio y categoría vienen de Admin → Productos.",
        marker: "product.info",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/productos",
      },
      {
        id: "product.purchase",
        label: "Compra",
        page: "producto",
        description: "Textos del panel de compra (agregar, agregado…).",
        marker: "product.purchase",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "product.breading",
        label: "Empanado / variantes",
        page: "producto",
        description: "Texto del selector de empanado. Las variantes vienen de Productos.",
        marker: "product.breading",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/productos",
      },
      {
        id: "product.stock",
        label: "Stock",
        page: "producto",
        description: "Textos de disponibilidad y poco/sin stock.",
        marker: "product.stock",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "product.description",
        label: "Descripción larga",
        page: "producto",
        description: "El texto se edita en Productos; la fuente, en Marca y estilos.",
        marker: "product.description",
        status: "partial",
        groups: ["content", "style"],
        advancedHref: "/admin/productos",
      },
      {
        id: "product.trust",
        label: "Confianza del producto",
        page: "producto",
        description: "Bloques Envíos / Pagos / Dudas.",
        marker: "product.trust",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/editor/confianza",
      },
    ],
  },
  {
    id: "carrito",
    label: "Carrito",
    description: "Barra y textos del carrito.",
    previewPath: "/#productos",
    status: "partial",
    sections: [
      {
        id: "cart.sticky",
        label: "Barra de carrito",
        page: "carrito",
        description: "Textos “Ver/Ocultar carrito” de la barra inferior.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "cart.actions",
        label: "Acciones del carrito",
        page: "carrito",
        description: "Botón “Continuar” hacia el checkout.",
        marker: "cart.actions",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "cart.item",
        label: "Producto en carrito",
        page: "carrito",
        description: "Cada línea del carrito. Los datos del producto vienen de Productos.",
        marker: "cart.item",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/productos",
      },
      {
        id: "cart.quantity",
        label: "Cantidad y controles",
        page: "carrito",
        description: "Botones + / − de cantidad del carrito.",
        marker: "cart.quantity",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "cart.totals",
        label: "Totales",
        page: "carrito",
        description: "Total del carrito (se calcula solo, no es texto editable).",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
      {
        id: "cart.messages",
        label: "Mensajes de stock / carrito vacío",
        page: "carrito",
        description: "Avisos de stock. El carrito vacío no muestra mensaje propio.",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/editor/catalogo",
      },
    ],
  },
  {
    id: "checkout",
    label: "Checkout",
    description: "Formulario y textos de compra.",
    previewPath: "/checkout",
    status: "partial",
    sections: [
      {
        id: "checkout.header",
        label: "Encabezado del checkout",
        page: "checkout",
        description: "Título de la pantalla, volver al carrito y carrito vacío.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "checkout.customer",
        label: "Datos del cliente",
        page: "checkout",
        description: "Nombre, teléfono, email y comentarios.",
        marker: "checkout.customer",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "checkout.delivery",
        label: "Entrega y retiro",
        page: "checkout",
        description: "Envío a domicilio, retiro, dirección y zona.",
        marker: "checkout.delivery",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "checkout.schedule",
        label: "Calendario y horarios",
        page: "checkout",
        description: "Textos de día y franja horaria.",
        marker: "checkout.schedule",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "checkout.payment",
        label: "Pago",
        page: "checkout",
        description: "Métodos de pago y transferencia (textos visibles).",
        marker: "checkout.payment",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/config/metodos-pago",
      },
      {
        id: "checkout.summary",
        label: "Resumen del pedido",
        page: "checkout",
        description: "Subtotal, descuentos, envío y total (etiquetas).",
        marker: "checkout.summary",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "checkout.submit",
        label: "Botón final",
        page: "checkout",
        description: "Confirmar pedido / Ir a pagar.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "checkout.messages",
        label: "Mensajes y errores",
        page: "checkout",
        description: "Avisos de validación y errores del checkout.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
    ],
  },
  {
    id: "pedido",
    label: "Páginas de pedido",
    description: "Confirmado, transferencia, pendiente y error.",
    previewPath: "/pedido/confirmado",
    status: "partial",
    sections: [
      {
        id: "order.header",
        label: "Encabezado del pedido",
        page: "pedido",
        description: "Título y subtítulo de “Pedido recibido / ¡Gracias!”.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "order.status",
        label: "Estado del pago",
        page: "pedido",
        description: "Encabezados de pago pendiente, rechazado y transferencia.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "order.summary",
        label: "Resumen del pedido",
        page: "pedido",
        description: "Etiquetas del resumen (los montos se calculan solos).",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "order.delivery",
        label: "Datos de entrega",
        page: "pedido",
        description: "Etiquetas de datos del cliente y entrega en el pedido.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "order.next_steps",
        label: "Próximos pasos",
        page: "pedido",
        description: "Instrucciones de transferencia y datos para pagar.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "order.actions",
        label: "Acciones del cliente",
        page: "pedido",
        description: "Botones “Seguir comprando”, “Volver”, reintentar, WhatsApp.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/checkout",
      },
      {
        id: "order.help",
        label: "Ayuda / contacto",
        page: "pedido",
        description: "Contacto por WhatsApp. Los datos del negocio son globales.",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/config/negocio",
      },
    ],
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
    description: "Envíos, cambios, términos y privacidad.",
    previewPath: "/envios",
    status: "partial",
    sections: [
      {
        id: "legal.shipping",
        label: "Envíos",
        page: "legales",
        description: "Zonas, horarios y costos de envío.",
        marker: "legal.shipping",
        previewPath: "/envios",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/legales",
      },
      {
        id: "legal.returns",
        label: "Cambios y devoluciones",
        page: "legales",
        description: "Condiciones de cambios, devoluciones y cancelaciones.",
        marker: "legal.returns",
        previewPath: "/cambios-devoluciones",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/legales",
      },
      {
        id: "legal.terms",
        label: "Términos y condiciones",
        page: "legales",
        description: "Términos de uso de la tienda online.",
        marker: "legal.terms",
        previewPath: "/terminos",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/legales",
      },
      {
        id: "legal.privacy",
        label: "Privacidad",
        page: "legales",
        description: "Política de privacidad y manejo de datos.",
        marker: "legal.privacy",
        previewPath: "/privacidad",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/legales",
      },
      {
        id: "legal.help",
        label: "Contacto legal / ayuda",
        page: "legales",
        description: "Contacto por WhatsApp en las páginas legales.",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/config/negocio",
      },
      {
        id: "legal.footer_links",
        label: "Links legales del footer",
        page: "legales",
        description: "Enlaces a Términos, Privacidad, etc. en el pie.",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/editor/footer",
      },
    ],
  },
  {
    id: "seo",
    label: "SEO y compartir",
    description: "Google, redes e imagen para compartir.",
    previewPath: "/",
    status: "partial",
    sections: [
      {
        id: "seo.google",
        label: "Google",
        page: "seo",
        description: "Título y descripción que ve Google (sitio y portada).",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/seo",
      },
      {
        id: "seo.share",
        label: "Compartir en redes",
        page: "seo",
        description: "Texto al pegar el link en WhatsApp, Instagram o Facebook.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/seo",
      },
      {
        id: "seo.image",
        label: "Imagen para compartir",
        page: "seo",
        description: "La imagen grande que aparece al compartir el link.",
        status: "partial",
        groups: ["image"],
        advancedHref: "/admin/editor/seo",
      },
      {
        id: "seo.preview",
        label: "Vista previa",
        page: "seo",
        description: "Cómo se vería en Google y al compartir.",
        status: "partial",
        groups: ["content"],
        advancedHref: "/admin/editor/seo",
      },
      {
        id: "seo.products",
        label: "Productos en Google",
        page: "seo",
        description: "Datos de productos para Google.",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/productos",
      },
      {
        id: "seo.indexing",
        label: "Indexación",
        page: "seo",
        description: "Sitemap, robots y cómo Google indexa la tienda.",
        status: "planned",
        groups: ["content"],
        advancedHref: "/admin/editor/seo",
      },
    ],
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

// Orden de presentación en el selector de página (no afecta la búsqueda por id).
const PAGE_DISPLAY_ORDER = [
  "home",
  "catalogo",
  "producto",
  "carrito",
  "checkout",
  "pedido",
  "global",
  "seo",
  "legales",
];

// Páginas ordenadas para el selector. Las que no estén en PAGE_DISPLAY_ORDER van
// al final, en su orden original.
export const CMS_VISUAL_PAGES_ORDERED: CmsVisualPage[] = [...CMS_VISUAL_PAGES]
  .sort((a, b) => {
    const ia = PAGE_DISPLAY_ORDER.indexOf(a.id);
    const ib = PAGE_DISPLAY_ORDER.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

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
