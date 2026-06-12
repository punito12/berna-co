// Turns a raw CMS key into a human-friendly label so the owner never sees a
// technical key like "checkout.step2.covered" or "home.pos.eyebrow".
//
// Rule: take the last segment after ".", replace "_"/"-" with spaces, map a few
// common technical words to Spanish, and capitalize. Used only for DISPLAY —
// the actual CMS keys are never changed.

const WORD_MAP: Record<string, string> = {
  eyebrow: "Texto pequeño de arriba",
  title: "Título",
  subtitle: "Subtítulo",
  body: "Texto",
  intro: "Introducción",
  label: "Etiqueta",
  placeholder: "Ejemplo",
  cta: "Botón",
  slogan: "Slogan",
  copyright: "Copyright",
  email: "Email",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

export function humanizeCmsKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  // Whole-segment match first (e.g. "eyebrow" → "Texto pequeño de arriba").
  if (WORD_MAP[last]) return WORD_MAP[last];
  const spaced = last.replace(/[_-]+/g, " ").trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
