export const CMS_FONT_OPTIONS = [
  "Archivo",
  "Fraunces",
  "Inter",
  "Poppins",
  "Montserrat",
  "Bebas Neue",
  "Playfair Display",
  "Lora",
  "Roboto",
  "Oswald",
  "Raleway",
  "Work Sans",
  "Merriweather",
  "Nunito",
  "DM Sans",
  "Space Grotesk",
  "Archivo Black",
  "Libre Franklin",
  "Anton",
  "Manrope",
  "Outfit",
  "Plus Jakarta Sans",
] as const;

export const CMS_FONT_SET = new Set<string>(CMS_FONT_OPTIONS);

const GOOGLE_FONT_FAMILIES: Record<(typeof CMS_FONT_OPTIONS)[number], string> = {
  Archivo: "Archivo:wght@300;400;500;600;700;800;900",
  Fraunces: "Fraunces:wght@400;500;600;700;800;900",
  Inter: "Inter:wght@300;400;500;600;700;800;900",
  Poppins: "Poppins:wght@300;400;500;600;700;800;900",
  Montserrat: "Montserrat:wght@300;400;500;600;700;800;900",
  "Bebas Neue": "Bebas Neue",
  "Playfair Display": "Playfair Display:wght@400;500;600;700;800;900",
  Lora: "Lora:wght@400;500;600;700",
  Roboto: "Roboto:wght@300;400;500;700;900",
  Oswald: "Oswald:wght@300;400;500;600;700",
  Raleway: "Raleway:wght@300;400;500;600;700;800;900",
  "Work Sans": "Work Sans:wght@300;400;500;600;700;800;900",
  Merriweather: "Merriweather:wght@300;400;700;900",
  Nunito: "Nunito:wght@300;400;500;600;700;800;900",
  "DM Sans": "DM Sans:wght@300;400;500;600;700;800;900",
  "Space Grotesk": "Space Grotesk:wght@300;400;500;600;700",
  "Archivo Black": "Archivo Black",
  "Libre Franklin": "Libre Franklin:wght@300;400;500;600;700;800;900",
  Anton: "Anton",
  Manrope: "Manrope:wght@300;400;500;600;700;800",
  Outfit: "Outfit:wght@300;400;500;600;700;800;900",
  "Plus Jakarta Sans": "Plus Jakarta Sans:wght@300;400;500;600;700;800",
};

function encodeGoogleFontFamily(family: string) {
  return encodeURIComponent(family).replace(/%20/g, "+");
}

export function cmsGoogleFontsUrl() {
  const families = CMS_FONT_OPTIONS.map(
    (font) => `family=${encodeGoogleFontFamily(GOOGLE_FONT_FAMILIES[font])}`
  ).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// Archivo y Fraunces ya vienen self-hosted vía next/font (no se piden a Google).
// El resto de las opciones de fuente del CMS solo se cargan si están realmente
// en uso en la config publicada.
const SELF_HOSTED_FONTS = new Set<string>(["Archivo", "Fraunces"]);

// Devuelve las familias de fuente (del set del CMS) que aparecen mencionadas en
// los strings JSON publicados que se le pasen (typography, estilos por-texto,
// configs de secciones). Es un escaneo por nombre: si una fuente del allowlist
// aparece en el JSON, se considera en uso. Excluye las self-hosted.
type CmsFont = (typeof CMS_FONT_OPTIONS)[number];

export function usedCmsFonts(
  jsonStrings: Array<string | null | undefined>
): CmsFont[] {
  const haystack = jsonStrings.filter(Boolean).join("\n");
  if (!haystack) return [];
  const used: CmsFont[] = [];
  for (const font of CMS_FONT_OPTIONS) {
    if (SELF_HOSTED_FONTS.has(font)) continue;
    // Coincidencia exacta del nombre entre comillas (así "Lora" no matchea
    // dentro de otra palabra y "DM Sans" matchea con su espacio).
    if (haystack.includes(`"${font}"`)) used.push(font);
  }
  return used;
}

// URL de Google Fonts SOLO con las familias en uso. Devuelve "" si no hay
// ninguna (caso por defecto: el diseño usa Archivo/Fraunces self-hosted, así que
// NO se emite ningún <link> bloqueante a Google Fonts).
export function cmsUsedGoogleFontsUrl(
  jsonStrings: Array<string | null | undefined>
): string {
  const used = usedCmsFonts(jsonStrings);
  if (used.length === 0) return "";
  const families = used
    .map((font) => `family=${encodeGoogleFontFamily(GOOGLE_FONT_FAMILIES[font])}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
