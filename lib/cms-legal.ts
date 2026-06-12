// Legal / trust pages content, editable from the CMS. Each public page
// (/terminos, /privacidad, /envios, /cambios-devoluciones) reads its title,
// intro and body from SiteText, falling back to the exact hardcoded content
// below so nothing ever goes blank.
//
// The `body` is a single multiline text. Sections are written as blocks
// separated by a blank line; the FIRST line of each block is the section title
// and the rest is its body. This keeps editing simple for the owner (one text
// area per page) while rendering the same titled cards as before.

import { prisma } from "@/lib/db";
import type { CmsBundle } from "@/lib/cms";
import { getSiteText } from "@/lib/cms";

export type LegalSection = { title: string; body: string };

export type LegalPageDef = {
  slug: "terminos" | "privacidad" | "envios" | "cambios";
  route: string;
  titleKey: string;
  introKey: string;
  bodyKey: string;
  fallbackTitle: string;
  fallbackIntro: string;
  fallbackSections: LegalSection[];
};

export const LEGAL_PAGES: LegalPageDef[] = [
  {
    slug: "terminos",
    route: "/terminos",
    titleKey: "legal.terminos.title",
    introKey: "legal.terminos.intro",
    bodyKey: "legal.terminos.body",
    fallbackTitle: "Términos y condiciones",
    fallbackIntro:
      "Estas condiciones explican el uso general de la tienda online y el proceso de compra. La operación final depende de disponibilidad, zona y coordinación del pedido.",
    fallbackSections: [
      {
        title: "Pedidos y disponibilidad",
        body: "Los productos se ofrecen según stock disponible. Si algún producto no estuviera disponible al preparar el pedido, nos comunicaremos para coordinar una alternativa o ajuste.",
      },
      {
        title: "Precios y promociones",
        body: "Los precios, promociones y descuentos pueden actualizarse. El total válido es el confirmado durante el checkout o por los canales de contacto oficiales.",
      },
      {
        title: "Entrega",
        body: "Las entregas se realizan en zonas, días y horarios disponibles según la configuración vigente. La dirección informada debe ser correcta para poder coordinar el envío.",
      },
      {
        title: "Atención del pedido",
        body: "Ante dudas, cambios necesarios o inconvenientes con una compra, el canal recomendado es WhatsApp. Revisá el pedido al recibirlo para avisarnos cuanto antes si hay algún problema.",
      },
    ],
  },
  {
    slug: "privacidad",
    route: "/privacidad",
    titleKey: "legal.privacidad.title",
    introKey: "legal.privacidad.intro",
    bodyKey: "legal.privacidad.body",
    fallbackTitle: "Política de privacidad",
    fallbackIntro:
      "Usamos la información necesaria para tomar pedidos, coordinar entregas y responder consultas. Esta página resume el tratamiento de datos de forma simple.",
    fallbackSections: [
      {
        title: "Datos que podemos solicitar",
        body: "Podemos pedir nombre, teléfono, email, dirección o zona de entrega, datos del pedido y cualquier información que el cliente comparta para coordinar la compra.",
      },
      {
        title: "Para qué los usamos",
        body: "Los usamos para confirmar pedidos, preparar productos, coordinar entregas, responder consultas, registrar operaciones y enviar comunicaciones solo cuando corresponda.",
      },
      {
        title: "Pagos",
        body: "Si se usan medios de pago externos, los datos de pago se procesan mediante proveedores especializados. Berna&co no necesita almacenar datos completos de tarjetas.",
      },
      {
        title: "Conservación y consultas",
        body: "Podemos conservar registros necesarios para operación, administración y atención postventa. Para consultar o pedir una corrección, contactanos por WhatsApp.",
      },
    ],
  },
  {
    slug: "envios",
    route: "/envios",
    titleKey: "legal.envios.title",
    introKey: "legal.envios.intro",
    bodyKey: "legal.envios.body",
    fallbackTitle: "Envíos y zonas de entrega",
    fallbackIntro:
      "La tienda valida zonas y opciones de entrega durante el checkout. Si tenés dudas antes de comprar, podés consultarnos por WhatsApp.",
    fallbackSections: [
      {
        title: "Zonas disponibles",
        body: "Las entregas se realizan en las zonas habilitadas al momento de comprar. Si una dirección queda fuera de cobertura, el checkout lo indicará o podremos confirmarlo por WhatsApp.",
      },
      {
        title: "Días y horarios",
        body: "Los días, franjas horarias y cupos disponibles pueden variar. La opción elegida en el checkout queda sujeta a confirmación operativa del pedido.",
      },
      {
        title: "Costo de envío",
        body: "El costo de envío, descuentos o umbrales de envío bonificado se muestran durante el checkout según la configuración vigente y la dirección del cliente.",
      },
      {
        title: "Recepción del pedido",
        body: "Al recibir productos congelados, recomendamos guardarlos rápidamente en freezer. Si hay un inconveniente con la entrega, contactanos cuanto antes.",
      },
    ],
  },
  {
    slug: "cambios",
    route: "/cambios-devoluciones",
    titleKey: "legal.cambios.title",
    introKey: "legal.cambios.intro",
    bodyKey: "legal.cambios.body",
    fallbackTitle: "Cambios, devoluciones y cancelaciones",
    fallbackIntro:
      "Trabajamos con alimentos congelados, por eso revisamos cada caso cuidando la seguridad y el estado de los productos.",
    fallbackSections: [
      {
        title: "Cambios o inconvenientes",
        body: "Si recibiste un producto equivocado, dañado o con algún problema, escribinos por WhatsApp lo antes posible con el número de pedido y, si ayuda, fotos del producto recibido.",
      },
      {
        title: "Productos alimenticios",
        body: "Por tratarse de alimentos, los cambios o devoluciones dependen del estado del producto, la conservación de la cadena de frío y el momento en que se informa el inconveniente.",
      },
      {
        title: "Cancelaciones",
        body: "Las cancelaciones pueden solicitarse antes de que el pedido entre en preparación o despacho. Si el pedido ya fue preparado o enviado, revisaremos el caso por WhatsApp.",
      },
      {
        title: "Resolución",
        body: "Cuando corresponda, podremos coordinar reposición, ajuste del pedido o devolución del importe según el medio de pago utilizado y el estado de la operación.",
      },
    ],
  },
];

// Serializes sections into the multiline `body` text used by the CMS field and
// the seed: each section is "Título\n<cuerpo>", blocks separated by a blank line.
export function sectionsToBody(sections: LegalSection[]): string {
  return sections.map((s) => `${s.title}\n${s.body}`).join("\n\n");
}

// Parses the multiline `body` back into titled sections. Each block (separated
// by a blank line) becomes a section: first line = title, rest = body. Empty
// input returns [] so callers can fall back to the hardcoded sections.
export function bodyToSections(body: string): LegalSection[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      const title = (lines.shift() ?? "").trim();
      const sectionBody = lines.join("\n").trim();
      return { title, body: sectionBody };
    })
    .filter((s) => s.title || s.body);
}

// Resolves the final content for a legal page from the CMS bundle, with the
// hardcoded values as fallback. If the CMS body is empty, the original sections
// are used — so the public page looks identical until the owner edits it.
export function resolveLegalContent(
  def: LegalPageDef,
  cms: CmsBundle,
  preview = false
): { title: string; intro: string; sections: LegalSection[] } {
  const title = getSiteText(cms, def.titleKey, def.fallbackTitle, preview);
  const intro = getSiteText(cms, def.introKey, def.fallbackIntro, preview);
  const rawBody = getSiteText(cms, def.bodyKey, "", preview);
  const parsed = bodyToSections(rawBody);
  const sections = parsed.length > 0 ? parsed : def.fallbackSections;
  return { title, intro, sections };
}

// CMS text rows (key + fallback value + maxLength) for the legal pages, used by
// the ensure function and the seed.
export const LEGAL_CMS_TEXTS = LEGAL_PAGES.flatMap((def) => [
  { key: def.titleKey, value: def.fallbackTitle, maxLength: 80 },
  { key: def.introKey, value: def.fallbackIntro, maxLength: 400 },
  { key: def.bodyKey, value: sectionsToBody(def.fallbackSections), maxLength: 6000 },
]);

// Idempotently creates the legal CMS texts that don't exist yet, so the owner
// can edit them. Never overwrites existing (edited/published) values. Uses a
// single batch $transaction (safe on Neon; no long interactive transaction).
export async function ensureLegalCmsTexts(): Promise<void> {
  const keys = LEGAL_CMS_TEXTS.map((t) => t.key);
  const existing = await prisma.siteText.findMany({
    where: { key: { in: keys } },
    select: { key: true },
  });
  const present = new Set(existing.map((row) => row.key));
  const toCreate = LEGAL_CMS_TEXTS.filter((t) => !present.has(t.key));
  if (toCreate.length === 0) return;

  await prisma.$transaction(
    toCreate.map((t) =>
      prisma.siteText.create({
        data: {
          key: t.key,
          value: t.value,
          valueDraft: t.value,
          maxLength: t.maxLength,
          category: "legal",
        },
      })
    )
  );
}
