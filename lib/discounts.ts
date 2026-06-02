// Discounts for the web store: per-product quantity promos (2x1 / 3x2) and
// typed discount codes (% or fixed). All money in whole pesos. Server-side
// validation lives here; the API/checkout call into it.

import { prisma } from "@/lib/db";

// How many units are CHARGED for a quantity promo. 2x1 -> pay 1 of every 2;
// 3x2 -> pay 2 of every 3. "" / unknown -> pay all.
export function chargeableUnits(qty: number, promoType: string): number {
  if (promoType === "2x1") return qty - Math.floor(qty / 2);
  if (promoType === "3x2") return qty - Math.floor(qty / 3);
  return qty;
}

// Discount in pesos from a quantity promo for one line (unitPrice already after
// any % promo). 0 when no quantity promo applies.
export function quantityPromoDiscount(
  qty: number,
  unitPrice: number,
  promoType: string
): number {
  const free = qty - chargeableUnits(qty, promoType);
  return free * unitPrice;
}

export type DiscountKind = "PERCENT" | "FIXED";

export type CodeValidation =
  | { ok: true; code: string; kind: DiscountKind; amount: number; label: string }
  | { ok: false; error: string };

// Validates a discount code against a products subtotal (pesos) and returns the
// discount amount to apply. Does NOT consume a use (that happens at order time).
export async function validateDiscountCode(
  rawCode: string,
  subtotal: number
): Promise<CodeValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Ingresá un código." };

  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc || !dc.active) {
    return { ok: false, error: "El código no existe o no está activo." };
  }
  if (dc.expiresAt && dc.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "El código está vencido." };
  }
  if (dc.maxUses > 0 && dc.usedCount >= dc.maxUses) {
    return { ok: false, error: "El código alcanzó su límite de usos." };
  }
  if (dc.minTotal > 0 && subtotal < dc.minTotal) {
    return {
      ok: false,
      error: `El código aplica en compras desde ${formatPesos(dc.minTotal)}.`,
    };
  }

  const kind = dc.kind as DiscountKind;
  let amount =
    kind === "PERCENT" ? Math.round((subtotal * dc.value) / 100) : dc.value;
  // Never discount more than the subtotal.
  amount = Math.min(amount, subtotal);

  const label =
    kind === "PERCENT" ? `${dc.value}% off` : `${formatPesos(dc.value)} off`;
  return { ok: true, code, kind, amount, label };
}

// Marks one use of a code. A single guarded updateMany: bumps usedCount only
// when maxUses is 0 (unlimited) OR the limit hasn't been reached. One query, so
// it's cheap inside the order transaction and safe under concurrency.
export async function consumeDiscountCode(code: string): Promise<void> {
  const upper = code.trim().toUpperCase();
  await prisma.$executeRaw`
    UPDATE "DiscountCode"
    SET "usedCount" = "usedCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = ${upper}
      AND ("maxUses" = 0 OR "usedCount" < "maxUses")
  `;
}

function formatPesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
