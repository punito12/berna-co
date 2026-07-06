// CMS de CONTENIDO (v2): fuente única de qué puede editar el negocio.
// Filosofía post-rediseño: el DISEÑO vive en el código; acá solo se editan
// textos, imágenes y contacto. Este schema alimenta:
//  - el admin /admin/editor/contenido (secciones + campos)
//  - el seeding de claves nuevas (scripts/seed-contenido.ts)
//  - la fase 3 (cablear componentes) usa estas mismas claves.

export type ContentField =
  | {
      kind: "text";
      key: string;
      label: string;
      fallback: string;
      maxLength: number;
      multiline?: boolean;
      /** Nota corta bajo el label (ej: explica los placeholders {count}). */
      hint?: string;
    }
  | {
      kind: "image";
      key: string;
      label: string;
      fallback: string;
      hint?: string;
    };

export type ContentSection = {
  id: string;
  title: string;
  description: string;
  fields: ContentField[];
};

// Categoría de las claves NUEVAS al sembrarlas (las existentes conservan la suya).
export const NEW_TEXT_CATEGORY: Record<string, string> = {};

export const CONTENT_SECTIONS: ContentSection[] = [
  {
    id: "header",
    title: "Header y navegación",
    description: "Las píldoras flotantes que acompañan toda la página.",
    fields: [
      { kind: "text", key: "header.products", label: "Botón Productos", fallback: "Productos", maxLength: 30 },
      { kind: "text", key: "header.cart", label: "Botón Carrito", fallback: "Carrito", maxLength: 30 },
    ],
  },
  {
    id: "hero",
    title: "Portada (hero)",
    description: "Lo primero que ve el cliente al entrar.",
    fields: [
      { kind: "text", key: "home.hero.title", label: "Título", fallback: "Milanesas premium\ny congelados caseros", maxLength: 120, multiline: true },
      { kind: "text", key: "home.hero.subtitle", label: "Subtítulo", fallback: "Elegí online, coordiná la entrega y pagá como prefieras.", maxLength: 160 },
      { kind: "text", key: "home.hero.cta_primary", label: "Botón principal", fallback: "Ver productos", maxLength: 40 },
      { kind: "image", key: "home.hero.background", label: "Foto de fondo", fallback: "/images/hero.jpg" },
    ],
  },
  {
    id: "nuestros-productos",
    title: "Nuestros productos",
    description: "El bloque de presentación del catálogo: sello, título, foto y etiquetas.",
    fields: [
      { kind: "text", key: "catalogo.eyebrow", label: "Sello (píldora negra)", fallback: "Congelados Caseros", maxLength: 40 },
      { kind: "text", key: "catalogo.title", label: "Título", fallback: "Nuestros productos", maxLength: 60 },
      { kind: "text", key: "catalogo.subtitle", label: "Subtítulo", fallback: "Elegí tu corte y empanado.", maxLength: 120 },
      { kind: "image", key: "home.products.photo", label: "Foto principal (tenedor)", fallback: "/images/nuestros-productos.jpg" },
      { kind: "image", key: "home.products.label1", label: "Etiqueta izquierda (PNG transparente)", fallback: "/images/nuestros-productos-1.png" },
      { kind: "image", key: "home.products.label2", label: "Etiqueta derecha (PNG transparente)", fallback: "/images/nuestros-productos-2.png" },
    ],
  },
  {
    id: "display",
    title: "Catálogo (cards)",
    description: "Textos de las tarjetas de producto y sus botones.",
    fields: [
      { kind: "text", key: "catalog.filter.all", label: "Filtro «Todos»", fallback: "Todos", maxLength: 20 },
      { kind: "text", key: "catalog.product.add_to_cart", label: "Botón agregar", fallback: "Agregar al carrito", maxLength: 40 },
      { kind: "text", key: "catalog.product.out_of_stock", label: "Sin stock", fallback: "Sin stock", maxLength: 40 },
      { kind: "text", key: "catalog.product.choose_breadcrumb", label: "Label empanado", fallback: "Empanado", maxLength: 30 },
      { kind: "text", key: "catalog.badge.new", label: "Badge nuevo", fallback: "NEW", maxLength: 20 },
      { kind: "text", key: "catalog.product.last_unit", label: "Última unidad", fallback: "¡Queda la última!", maxLength: 40 },
      { kind: "text", key: "catalog.product.cash_short", label: "Precio efectivo (corto)", fallback: "Efectivo o transferencia", maxLength: 40 },
    ],
  },
  {
    id: "sobre-nosotros",
    title: "Sobre nosotros",
    description: "El panel negro con la historia de la marca.",
    fields: [
      { kind: "text", key: "home.about.eyebrow", label: "Sello (opcional)", fallback: "", maxLength: 40 },
      { kind: "text", key: "home.about.title", label: "Título", fallback: "BERNA & CO", maxLength: 30 },
      { kind: "text", key: "home.about.paragraph", label: "Historia", fallback: "Nace de nuestro amor por la comida rica, práctica y bien hecha.", maxLength: 2000, multiline: true },
      { kind: "image", key: "home.about.image", label: "Foto", fallback: "/images/about/cocina.jpg" },
      { kind: "text", key: "about.read_more", label: "Botón leer más (mobile)", fallback: "Leer más", maxLength: 30 },
      { kind: "text", key: "about.read_less", label: "Botón leer menos (mobile)", fallback: "Leer menos", maxLength: 30 },
    ],
  },
  {
    id: "ingredientes",
    title: "Ingredientes",
    description: "Las 3 tarjetas del inicio y sus páginas de beneficios (textos + fotos).",
    fields: [
      { kind: "text", key: "home.ingredients.eyebrow", label: "Sello de la sección", fallback: "Lo que hay adentro", maxLength: 40 },
      { kind: "text", key: "home.ingredients.title", label: "Título de la sección", fallback: "Nuestros ingredientes", maxLength: 50 },
      { kind: "text", key: "ingredient.stamp", label: "Sello en página de detalle", fallback: "Nuestros ingredientes", maxLength: 40 },
      { kind: "text", key: "ingredient.preparations", label: "Label «En nuestras preparaciones»", fallback: "En nuestras preparaciones", maxLength: 60 },
      { kind: "text", key: "ingredient.back", label: "Botón volver", fallback: "Volver", maxLength: 30 },
      { kind: "text", key: "ingredient.cta", label: "Botón ver productos", fallback: "Ver productos", maxLength: 40 },
      { kind: "text", key: "ingredient.huevos.title", label: "Huevos · título", fallback: "Huevos", maxLength: 60 },
      { kind: "text", key: "ingredient.huevos.body", label: "Huevos · texto", fallback: "", maxLength: 2000, multiline: true },
      { kind: "image", key: "ingredient.huevos.photo", label: "Huevos · foto", fallback: "/images/ingredientes/huevos.png" },
      { kind: "text", key: "ingredient.pollo.title", label: "Pollo · título", fallback: "Pollo Pastoril", maxLength: 60 },
      { kind: "text", key: "ingredient.pollo.body", label: "Pollo · texto", fallback: "", maxLength: 2000, multiline: true },
      { kind: "image", key: "ingredient.pollo-pastoril.photo", label: "Pollo · foto", fallback: "/images/ingredientes/pollo-pastoril.png" },
      { kind: "text", key: "ingredient.peceto.title", label: "Peceto · título", fallback: "Peceto de Pastura", maxLength: 60 },
      { kind: "text", key: "ingredient.peceto.body", label: "Peceto · texto", fallback: "", maxLength: 2000, multiline: true },
      { kind: "image", key: "ingredient.peceto-de-pastura.photo", label: "Peceto · foto", fallback: "/images/ingredientes/peceto-de-pastura.png" },
    ],
  },
  {
    id: "carrito",
    title: "Carrito flotante",
    description: "El panel que se abre desde el botón del carrito.",
    fields: [
      { kind: "text", key: "cart.title", label: "Título", fallback: "Tu carrito", maxLength: 40 },
      { kind: "text", key: "cart.tagline", label: "Frase bajo el título", fallback: "Listas para tu freezer.", maxLength: 80 },
      { kind: "text", key: "cart.empty", label: "Carrito vacío · título", fallback: "Tu carrito está vacío", maxLength: 60 },
      { kind: "text", key: "cart.empty_sub", label: "Carrito vacío · frase", fallback: "Llenalo de milanesas.", maxLength: 80 },
      { kind: "text", key: "cart.view_products", label: "Botón ver productos", fallback: "Ver productos", maxLength: 40 },
      { kind: "text", key: "cart.cta", label: "Botón finalizar", fallback: "Finalizar pedido", maxLength: 40 },
      { kind: "text", key: "cart.discount_achieved", label: "Descuento logrado", fallback: "¡Felicitaciones! Tenés {pct}% OFF", maxLength: 80, hint: "{pct} = porcentaje de descuento" },
      { kind: "text", key: "cart.discount_apply", label: "Aclaración descuento", fallback: "Se aplica al total en el checkout.", maxLength: 100 },
      { kind: "text", key: "cart.discount_next", label: "Empuje al próximo tramo", fallback: "Sumá {count} más y pasás al {pct}% OFF.", maxLength: 100, hint: "{count} = unidades que faltan, {pct} = % del tramo" },
      { kind: "text", key: "cart.discount_missing", label: "Faltan unidades", fallback: "Te faltan {count} para el {pct}% OFF", maxLength: 100, hint: "{count} = unidades que faltan, {pct} = % del tramo" },
    ],
  },
  {
    id: "footer",
    title: "Pie de página",
    description: "Slogan de la cinta, contacto y etiqueta de marca.",
    fields: [
      { kind: "text", key: "footer.slogan", label: "Slogan (cinta)", fallback: "¡La vida es rica!", maxLength: 60 },
      { kind: "image", key: "footer.badge", label: "Etiqueta BERNA&CO (PNG transparente)", fallback: "/images/footer.png" },
      { kind: "text", key: "footer.whatsapp", label: "WhatsApp (visible)", fallback: "+54 11 2545-0304", maxLength: 40 },
      { kind: "text", key: "footer.instagram", label: "Instagram (visible)", fallback: "@berna.and.co", maxLength: 60 },
      { kind: "text", key: "footer.instagramUrl", label: "Instagram (link)", fallback: "https://instagram.com/berna.and.co", maxLength: 200 },
      { kind: "text", key: "footer.email", label: "Email", fallback: "csberna2020@gmail.com", maxLength: 100 },
      { kind: "text", key: "footer.copyright", label: "Copyright", fallback: "© Berna&co. Todos los derechos reservados.", maxLength: 120 },
    ],
  },
];

// Categoría por sección para las claves nuevas (para agrupar en la DB).
export function categoryForSection(sectionId: string): string {
  switch (sectionId) {
    case "carrito":
      return "carrito";
    case "display":
      return "catalogo";
    case "footer":
      return "footer";
    case "ingredientes":
      return "home";
    default:
      return "home";
  }
}
