export const CMS_BLOCK_TYPES = [
  "hero",
  "rich_text",
  "products_grid",
  "features",
  "image_text",
  "faq",
  "cta",
  "newsletter",
  "map",
  "footer",
] as const;

export type CmsBlockType = (typeof CMS_BLOCK_TYPES)[number];

export type CmsBlockConfig = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  imageAlt?: string;
  mapSrc?: string;
  items?: { title: string; body?: string }[];
  faqs?: { question: string; answer: string }[];
  imageSide?: "left" | "right";
};

export const CMS_BLOCK_LABELS: Record<CmsBlockType, string> = {
  hero: "Hero",
  rich_text: "Texto",
  products_grid: "Grilla de productos",
  features: "Beneficios / columnas",
  image_text: "Imagen + texto",
  faq: "Preguntas frecuentes",
  cta: "Llamado a la acción",
  newsletter: "Newsletter",
  map: "Mapa",
  footer: "Footer",
};

export function isCmsBlockType(value: string): value is CmsBlockType {
  return (CMS_BLOCK_TYPES as readonly string[]).includes(value);
}

export function normalizeBlockType(type: string, key = ""): CmsBlockType {
  if (key === "home.footer") return "footer";
  if (key === "home.pos") return "map";
  if (isCmsBlockType(type)) return type;
  if (type === "products_grid") return "products_grid";
  if (type === "features") return "features";
  return "rich_text";
}

export function parseBlockConfig(raw: string): CmsBlockConfig {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return sanitizeBlockConfig(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function isDeletedBlockConfig(raw: string): boolean {
  return hasBlockFlag(raw, "__deleted");
}

export function isDraftOnlyBlockConfig(raw: string): boolean {
  return hasBlockFlag(raw, "__draftOnly");
}

function hasBlockFlag(raw: string, flag: "__deleted" | "__draftOnly"): boolean {
  try {
    const parsed = JSON.parse(raw);
    return (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>)[flag] === true
    );
  } catch {
    return false;
  }
}

export function sanitizeBlockConfig(input: Record<string, unknown>): CmsBlockConfig {
  const out: CmsBlockConfig = {};
  for (const key of [
    "eyebrow",
    "title",
    "subtitle",
    "body",
    "ctaLabel",
    "ctaHref",
    "imageUrl",
    "imageAlt",
    "mapSrc",
  ] as const) {
    const value = input[key];
    if (typeof value === "string") out[key] = value.slice(0, key === "body" ? 5000 : 500);
  }
  if (input.imageSide === "left" || input.imageSide === "right") {
    out.imageSide = input.imageSide;
  }
  if (Array.isArray(input.items)) {
    out.items = input.items.slice(0, 8).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        title: typeof row.title === "string" ? row.title.slice(0, 120) : "",
        body: typeof row.body === "string" ? row.body.slice(0, 500) : "",
      };
    });
  }
  if (Array.isArray(input.faqs)) {
    out.faqs = input.faqs.slice(0, 12).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        question:
          typeof row.question === "string" ? row.question.slice(0, 180) : "",
        answer: typeof row.answer === "string" ? row.answer.slice(0, 1000) : "",
      };
    });
  }
  return out;
}

export function defaultBlockConfig(type: CmsBlockType): CmsBlockConfig {
  switch (type) {
    case "hero":
      return {
        title: "Nuevo hero",
        subtitle: "Texto destacado de la sección",
        ctaLabel: "Ver productos",
        ctaHref: "#productos",
      };
    case "products_grid":
      return {
        eyebrow: "Congelados Caseros",
        title: "Nuestros productos",
        subtitle: "Elegí tu corte y tu empanado. Listas para el horno.",
      };
    case "features":
      return {
        eyebrow: "Lo que hay adentro",
        title: "Nuestros ingredientes",
        items: [
          { title: "Huevos de gallinas libres" },
          { title: "Pollo pastoril" },
          { title: "Peceto de pastura" },
        ],
      };
    case "image_text":
      return {
        eyebrow: "Berna&co",
        title: "Título de la sección",
        body: "Escribí el contenido de esta sección.",
        imageSide: "left",
      };
    case "faq":
      return {
        title: "Preguntas frecuentes",
        faqs: [{ question: "Pregunta", answer: "Respuesta" }],
      };
    case "cta":
      return {
        title: "La vida es rica",
        subtitle: "Elegí tus productos favoritos.",
        ctaLabel: "Ver productos",
        ctaHref: "#productos",
      };
    case "newsletter":
      return {
        title: "Sumate al newsletter",
        subtitle: "Novedades, recetas y promos. Sin spam.",
      };
    case "map":
      return {
        eyebrow: "Dónde encontrarnos",
        title: "Puntos de venta",
        subtitle: "Conseguí nuestros productos en estos locales.",
        mapSrc:
          "https://www.google.com/maps/d/u/0/embed?mid=1CRRd8EzBrKPIstPRUzWnWiaOeoeQOCE&ehbc=2E312F",
      };
    case "footer":
      return {};
    case "rich_text":
    default:
      return {
        title: "Nueva sección",
        body: "Escribí el contenido de esta sección.",
      };
  }
}

export function validateBlockConfig(type: CmsBlockType, config: CmsBlockConfig): string[] {
  const issues: string[] = [];
  if (["hero", "rich_text", "features", "image_text", "faq", "cta"].includes(type)) {
    if (!config.title?.trim()) issues.push("La sección necesita un título.");
  }
  if (type === "faq" && (!config.faqs || config.faqs.length === 0)) {
    issues.push("Agregá al menos una pregunta.");
  }
  if (type === "map" && config.mapSrc && !config.mapSrc.startsWith("https://")) {
    issues.push("El mapa debe usar una URL https.");
  }
  if (config.ctaHref && !isSafeHref(config.ctaHref)) {
    issues.push("El link del botón no es válido.");
  }
  if (config.imageUrl && !isSafeImagePath(config.imageUrl)) {
    issues.push("La imagen debe ser una ruta /images/... o una URL https.");
  }
  return issues;
}

function isSafeHref(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("#") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  );
}

function isSafeImagePath(value: string): boolean {
  return value.startsWith("/images/") || value.startsWith("https://");
}
