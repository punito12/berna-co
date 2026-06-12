// Checkout CMS texts that the storefront reads through `ct("key", "fallback")`
// but that historically were never seeded as editable rows. This module is the
// single source of truth for those keys so the owner can edit ALL checkout copy
// from the editor.
//
// `ensureCheckoutCmsTexts()` is idempotent: it ONLY creates rows that are
// missing and never overwrites an existing (possibly edited/published) value.
// It's called when the checkout editor page loads, mirroring the existing
// ingredient ensure pattern — so no manual seed is required in production.

import { prisma } from "@/lib/db";

export type CheckoutCmsText = {
  key: string;
  value: string; // = the exact hardcoded fallback in app/checkout/page.tsx
  maxLength: number;
};

export const CHECKOUT_CMS_TEXTS: CheckoutCmsText[] = [
  { key: "checkout.back", value: "Volver", maxLength: 60 },
  { key: "checkout.discount.access", value: "accedés a", maxLength: 60 },
  { key: "checkout.discount.apply", value: "Aplicar", maxLength: 60 },
  { key: "checkout.discount.code_label", value: "Código", maxLength: 60 },
  { key: "checkout.discount.missing_prefix", value: "Te faltan", maxLength: 60 },
  { key: "checkout.discount.missing_suffix", value: "para llegar a", maxLength: 60 },
  { key: "checkout.discount.placeholder", value: "Ej: BERNA10", maxLength: 60 },
  { key: "checkout.discount.quantity_earned", value: "Comprando", maxLength: 60 },
  { key: "checkout.discount.quantity_title", value: "Descuento por cantidad", maxLength: 60 },
  { key: "checkout.discount.question", value: "¿Tenés un código de descuento?", maxLength: 60 },
  { key: "checkout.discount.remove", value: "Quitar", maxLength: 60 },
  { key: "checkout.discount.unit", value: "unidad", maxLength: 60 },
  { key: "checkout.discount.units", value: "unidades", maxLength: 60 },
  { key: "checkout.help.cart_title", value: "Tengo en el carrito:", maxLength: 60 },
  { key: "checkout.help.customer_data", value: "Mis datos:", maxLength: 60 },
  { key: "checkout.help.whatsapp_intro", value: "Hola! Estoy queriendo hacer un pedido y necesito ayuda.", maxLength: 100 },
  { key: "checkout.step1.email_placeholder", value: "Ej: juana@email.com", maxLength: 60 },
  { key: "checkout.step1.name_placeholder", value: "Ej: Juana Pérez", maxLength: 60 },
  { key: "checkout.step1.notes_placeholder", value: "Ej: tocar timbre 2B", maxLength: 60 },
  { key: "checkout.step1.phone_placeholder", value: "Ej: 11 2345 6789", maxLength: 60 },
  { key: "checkout.step2.checking_zone", value: "Verificando…", maxLength: 60 },
  { key: "checkout.step2.covered", value: "Entregamos en tu dirección", maxLength: 60 },
  { key: "checkout.step2.floor_label", value: "Piso / depto / barrio (opcional)", maxLength: 100 },
  { key: "checkout.step2.floor_placeholder", value: "Ej: Piso 3 B, o Barrio Los Robles, lote 12", maxLength: 100 },
  { key: "checkout.step2.locality_label", value: "Localidad", maxLength: 60 },
  { key: "checkout.step2.locality_placeholder", value: "Ej: Tigre", maxLength: 60 },
  { key: "checkout.step2.not_located", value: "No pudimos ubicar esa dirección. Revisá que esté completa (calle, número y localidad).", maxLength: 200 },
  { key: "checkout.step2.postal_label", value: "Código postal (opcional)", maxLength: 60 },
  { key: "checkout.step2.postal_placeholder", value: "Ej: 1648", maxLength: 60 },
  { key: "checkout.step2.street_label", value: "Calle y número", maxLength: 60 },
  { key: "checkout.step2.street_placeholder", value: "Ej: Avenida Italia 600", maxLength: 60 },
  { key: "checkout.step2.verify_address", value: "Verificar dirección", maxLength: 60 },
  { key: "checkout.step3.no_days", value: "Tu zona no tiene días de entrega configurados por el momento.", maxLength: 200 },
  { key: "checkout.step3.no_slots", value: "No hay horarios disponibles por ahora.", maxLength: 100 },
  { key: "checkout.step3.verify_first", value: "Primero verificá tu zona de entrega (paso 2) para ver los días disponibles.", maxLength: 200 },
  { key: "checkout.step4.cash_subtitle", value: "Pagás cuando te llega el pedido", maxLength: 100 },
  { key: "checkout.step4.mp_note", value: "Al confirmar te llevamos a Mercado Pago para completar el pago.", maxLength: 200 },
  { key: "checkout.step4.mp_subtitle", value: "Crédito o débito a través de Mercado Pago", maxLength: 100 },
  { key: "checkout.step4.transfer_subtitle", value: "Transferís y enviás el comprobante por WhatsApp", maxLength: 100 },
  { key: "checkout.summary.free", value: "Gratis", maxLength: 60 },
  { key: "checkout.summary.promos", value: "Promos (2x1 / 3x2)", maxLength: 60 },
  { key: "checkout.summary.quantity_discount", value: "Descuento por cantidad", maxLength: 60 },
  { key: "checkout.summary.shipping", value: "Envío", maxLength: 60 },
  { key: "checkout.summary.subtotal", value: "Subtotal estimado", maxLength: 60 },
  { key: "checkout.summary.total", value: "Total", maxLength: 60 },
  { key: "checkout.validation.connection", value: "Hubo un problema de conexión. Probá de nuevo.", maxLength: 100 },
  { key: "checkout.validation.date", value: "Elegí un día de entrega.", maxLength: 60 },
  { key: "checkout.validation.locality", value: "Ingresá la localidad.", maxLength: 60 },
  { key: "checkout.validation.name", value: "Ingresá tu nombre.", maxLength: 60 },
  { key: "checkout.validation.phone", value: "Ingresá tu teléfono.", maxLength: 60 },
  { key: "checkout.validation.slot", value: "Elegí un horario.", maxLength: 60 },
  { key: "checkout.validation.street", value: "Ingresá la calle y número.", maxLength: 60 },
  { key: "checkout.validation.submit_error", value: "No pudimos guardar el pedido.", maxLength: 60 },
  { key: "checkout.validation.verify_address", value: "Verificá tu dirección (paso 2) antes de seguir.", maxLength: 100 },
  { key: "checkout.validation.zone_error", value: "No pudimos verificar tu dirección.", maxLength: 100 },
];

// Creates the missing checkout texts so they show up as editable rows. Only
// inserts keys that don't exist yet — existing rows (edited or published) are
// left untouched. Uses a single batch $transaction (safe on Neon serverless;
// no long interactive transaction).
export async function ensureCheckoutCmsTexts(): Promise<void> {
  const existing = await prisma.siteText.findMany({
    where: { key: { in: CHECKOUT_CMS_TEXTS.map((t) => t.key) } },
    select: { key: true },
  });
  const present = new Set(existing.map((row) => row.key));
  const toCreate = CHECKOUT_CMS_TEXTS.filter((t) => !present.has(t.key));
  if (toCreate.length === 0) return;

  await prisma.$transaction(
    toCreate.map((t) =>
      prisma.siteText.create({
        data: {
          key: t.key,
          value: t.value,
          valueDraft: t.value,
          maxLength: t.maxLength,
          category: "checkout",
        },
      })
    )
  );
}
