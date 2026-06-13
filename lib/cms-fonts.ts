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
