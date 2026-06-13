// Trust / conversion content for the public /confianza page, editable from the
// CMS (Editor → Confianza). Reuses SiteText keys (no new Prisma model). Every
// field falls back to sensible default copy so the public page never shows an
// editable-placeholder to customers.

import { prisma } from "@/lib/db";
import type { CmsBundle } from "@/lib/cms";
import { getSiteText } from "@/lib/cms";

// --- Sections with title / intro / body (multiline, blank line = paragraph) ---

export type TrustSectionDef = {
  slug: string;
  titleKey: string;
  introKey: string;
  bodyKey: string;
  fallbackTitle: string;
  fallbackIntro: string;
  fallbackBody: string;
};

export const TRUST_SECTIONS: TrustSectionDef[] = [
  {
    slug: "como-comprar",
    titleKey: "trust.como_comprar.title",
    introKey: "trust.como_comprar.intro",
    bodyKey: "trust.como_comprar.body",
    fallbackTitle: "Cómo comprar",
    fallbackIntro:
      "Hacer un pedido es simple y te toma pocos minutos. Te explicamos los pasos.",
    fallbackBody:
      "1. Elegí tus productos\nNavegá el catálogo, elegí el empanado y agregá lo que quieras al carrito.\n\n2. Completá tus datos\nEn el checkout cargás tu nombre, teléfono y la dirección de entrega o retiro.\n\n3. Elegí cómo pagar y confirmá\nSeleccioná el medio de pago, revisá el resumen y confirmá el pedido. Te contactamos por WhatsApp para coordinar la entrega.",
  },
  {
    slug: "envios",
    titleKey: "trust.envios.title",
    introKey: "trust.envios.intro",
    bodyKey: "trust.envios.body",
    fallbackTitle: "Envíos y zonas",
    fallbackIntro:
      "Entregamos en las zonas habilitadas y coordinamos día y horario con vos.",
    fallbackBody:
      "Zonas de entrega\nDurante el checkout verificamos tu dirección para confirmar si está dentro de la zona de entrega. Si tu dirección queda fuera de cobertura, te lo indicamos para coordinar una alternativa.\n\nDías y horarios\nLos días y franjas horarias disponibles se muestran al finalizar la compra. La opción que elegís queda sujeta a confirmación del pedido.\n\n¿Dudas antes de comprar?\nSi querés confirmar si llegamos a tu zona, escribinos por WhatsApp y te ayudamos.",
  },
  {
    slug: "conservacion",
    titleKey: "trust.conservacion.title",
    introKey: "trust.conservacion.intro",
    bodyKey: "trust.conservacion.body",
    fallbackTitle: "Conservación de congelados",
    fallbackIntro:
      "Nuestros productos viajan y se entregan congelados. Te contamos cómo conservarlos.",
    fallbackBody:
      "Al recibir el pedido\nGuardá los productos en el freezer lo antes posible para mantener la cadena de frío.\n\nConservación\nMantené los productos en el freezer hasta el momento de cocinarlos. Evitá descongelar y volver a congelar.\n\nAl cocinar\nPodés cocinar muchos de nuestros productos directamente del freezer, sin descongelar. Seguí las indicaciones del envase para un mejor resultado.",
  },
  {
    slug: "medios-de-pago",
    titleKey: "trust.medios_pago.title",
    introKey: "trust.medios_pago.intro",
    bodyKey: "trust.medios_pago.body",
    fallbackTitle: "Medios de pago",
    fallbackIntro:
      "Podés pagar de la forma que te resulte más cómoda. Estas son las opciones.",
    fallbackBody:
      "Mercado Pago\nPagás con tarjeta de crédito o débito a través de Mercado Pago, de forma online y segura, al confirmar el pedido.\n\nTransferencia\nTe pasamos los datos para transferir y nos enviás el comprobante por WhatsApp.\n\nEfectivo\nEn las entregas que lo permiten, podés abonar en efectivo al recibir el pedido.\n\nPago pendiente\nSi un pago con Mercado Pago queda pendiente o no se completa, el pedido queda registrado sin confirmar. Podés reintentar el pago o coordinar otra forma con nosotros por WhatsApp.",
  },
];

// --- FAQ: a list of question/answer items stored in a single multiline text ---

export const FAQ_KEY = "trust.faq.items";

export type FaqItem = { question: string; answer: string };

export const FALLBACK_FAQ: FaqItem[] = [
  {
    question: "¿Cómo hago un pedido?",
    answer:
      "Elegí tus productos en el catálogo, agregalos al carrito y completá el checkout con tus datos y el medio de pago. Te contactamos por WhatsApp para coordinar la entrega.",
  },
  {
    question: "¿Qué zonas de entrega cubren?",
    answer:
      "Entregamos en las zonas habilitadas. Durante el checkout verificamos tu dirección; si querés confirmar antes, escribinos por WhatsApp.",
  },
  {
    question: "¿Los productos vienen congelados?",
    answer:
      "Sí. Nuestros productos se entregan congelados. Te recomendamos guardarlos en el freezer apenas los recibís.",
  },
  {
    question: "¿Cómo los conservo?",
    answer:
      "Mantenelos en el freezer hasta el momento de cocinarlos y evitá descongelar y volver a congelar. Muchos productos se cocinan directo del freezer.",
  },
  {
    question: "¿Qué medios de pago aceptan?",
    answer:
      "Mercado Pago (tarjeta de crédito o débito), transferencia con comprobante por WhatsApp y, en las entregas que lo permiten, efectivo.",
  },
  {
    question: "¿Qué pasa si mi pago queda pendiente?",
    answer:
      "El pedido queda registrado sin confirmar. Podés reintentar el pago con Mercado Pago o coordinar otra forma con nosotros por WhatsApp.",
  },
];

// --- Section body parsing (shared format with legales) ----------------------

export type TrustBlock = { heading: string; body: string };

export function bodyToBlocks(body: string): TrustBlock[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      const heading = (lines.shift() ?? "").trim();
      return { heading, body: lines.join("\n").trim() };
    })
    .filter((b) => b.heading || b.body);
}

export function blocksToBody(blocks: TrustBlock[]): string {
  return blocks.map((b) => `${b.heading}\n${b.body}`).join("\n\n");
}

// --- FAQ parsing: "Q: ...\nA: ..." blocks separated by a blank line ----------

export function faqToText(items: FaqItem[]): string {
  return items.map((i) => `Q: ${i.question}\nA: ${i.answer}`).join("\n\n");
}

export function textToFaq(text: string): FaqItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      let question = "";
      let answer = "";
      for (const line of lines) {
        if (line.startsWith("Q:")) question = line.slice(2).trim();
        else if (line.startsWith("A:")) answer = line.slice(2).trim();
        else if (answer) answer += "\n" + line;
        else if (question) question += " " + line.trim();
      }
      return { question, answer };
    })
    .filter((i) => i.question || i.answer);
}

// --- Public readers (with fallbacks) ----------------------------------------

export function resolveTrustSection(
  def: TrustSectionDef,
  cms: CmsBundle,
  preview = false
): { title: string; intro: string; blocks: TrustBlock[] } {
  const title = getSiteText(cms, def.titleKey, def.fallbackTitle, preview);
  const intro = getSiteText(cms, def.introKey, def.fallbackIntro, preview);
  const rawBody = getSiteText(cms, def.bodyKey, "", preview);
  const parsed = bodyToBlocks(rawBody);
  const blocks =
    parsed.length > 0 ? parsed : bodyToBlocks(def.fallbackBody);
  return { title, intro, blocks };
}

export function resolveFaq(cms: CmsBundle, preview = false): FaqItem[] {
  const raw = getSiteText(cms, FAQ_KEY, "", preview);
  const parsed = textToFaq(raw);
  return parsed.length > 0 ? parsed : FALLBACK_FAQ;
}

// --- CMS rows + idempotent ensure -------------------------------------------

export const TRUST_CMS_TEXTS = [
  ...TRUST_SECTIONS.flatMap((def) => [
    { key: def.titleKey, value: def.fallbackTitle, maxLength: 80 },
    { key: def.introKey, value: def.fallbackIntro, maxLength: 300 },
    { key: def.bodyKey, value: def.fallbackBody, maxLength: 4000 },
  ]),
  { key: FAQ_KEY, value: faqToText(FALLBACK_FAQ), maxLength: 6000 },
];

// Creates the trust texts that don't exist yet so the owner can edit them.
// Never overwrites existing (edited/published) values. Single batch transaction
// (safe on Neon).
export async function ensureTrustCmsTexts(): Promise<void> {
  const keys = TRUST_CMS_TEXTS.map((t) => t.key);
  const existing = await prisma.siteText.findMany({
    where: { key: { in: keys } },
    select: { key: true },
  });
  const present = new Set(existing.map((r) => r.key));
  const toCreate = TRUST_CMS_TEXTS.filter((t) => !present.has(t.key));
  if (toCreate.length === 0) return;
  await prisma.$transaction(
    toCreate.map((t) =>
      prisma.siteText.create({
        data: {
          key: t.key,
          value: t.value,
          valueDraft: t.value,
          maxLength: t.maxLength,
          category: "trust",
        },
      })
    )
  );
}
