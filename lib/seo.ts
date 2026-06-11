export const SITE_NAME = "Berna&co";
export const SITE_DOMAIN = "https://csberna.com.ar";
export const SITE_TITLE =
  "Berna&co | Carnes, milanesas y congelados premium";
export const SITE_DESCRIPTION =
  "Comprá carnes, milanesas y productos congelados premium de Berna&co. Pedidos online, productos seleccionados y entrega en zonas disponibles.";
export const DEFAULT_OG_IMAGE = "/images/hero.jpg";

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_BASE_URL;
  if (raw) {
    try {
      const url = new URL(raw);
      if (
        url.hostname === "csberna.com.ar" ||
        url.hostname === "www.csberna.com.ar"
      ) {
        return new URL(url.origin);
      }
    } catch {
      // Fall through to the canonical domain.
    }
  }
  return new URL(SITE_DOMAIN);
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}
