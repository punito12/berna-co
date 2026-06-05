// Volume discounts (descuentos por cantidad). Each tier grants a % off the
// products subtotal once the order reaches `minKg` total. The highest active
// tier the customer reaches wins.

import { prisma } from "@/lib/db";

export type QuantityTier = {
  id: string;
  minKg: number;
  discountPercent: number;
  active: boolean;
};

export async function listQuantityDiscounts(): Promise<QuantityTier[]> {
  const rows = await prisma.quantityDiscount.findMany({
    orderBy: { minKg: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    minKg: r.minKg,
    discountPercent: r.discountPercent,
    active: r.active,
  }));
}

// Active tiers only, ascending by minKg — used by the storefront/checkout.
export async function listActiveQuantityTiers(): Promise<QuantityTier[]> {
  return (await listQuantityDiscounts()).filter((t) => t.active);
}

export async function createQuantityDiscount(input: {
  minKg: number;
  discountPercent: number;
  active?: boolean;
}) {
  const minKg = Number(input.minKg);
  if (!Number.isFinite(minKg) || minKg <= 0)
    throw new Error("El mínimo de kg tiene que ser mayor a 0.");
  const discountPercent = Math.round(Number(input.discountPercent));
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100)
    throw new Error("El descuento tiene que estar entre 1 y 100.");

  // No two tiers with the same minKg.
  const dupe = await prisma.quantityDiscount.findFirst({ where: { minKg } });
  if (dupe) throw new Error(`Ya existe un tramo de ${minKg} kg.`);

  return prisma.quantityDiscount.create({
    data: { minKg, discountPercent, active: input.active ?? true },
  });
}

export async function updateQuantityDiscount(
  id: string,
  input: { minKg?: number; discountPercent?: number; active?: boolean }
) {
  const data: Record<string, unknown> = {};
  if (input.minKg !== undefined) {
    const minKg = Number(input.minKg);
    if (!Number.isFinite(minKg) || minKg <= 0)
      throw new Error("El mínimo de kg tiene que ser mayor a 0.");
    const dupe = await prisma.quantityDiscount.findFirst({
      where: { minKg, id: { not: id } },
    });
    if (dupe) throw new Error(`Ya existe un tramo de ${minKg} kg.`);
    data.minKg = minKg;
  }
  if (input.discountPercent !== undefined) {
    const dp = Math.round(Number(input.discountPercent));
    if (!Number.isFinite(dp) || dp <= 0 || dp > 100)
      throw new Error("El descuento tiene que estar entre 1 y 100.");
    data.discountPercent = dp;
  }
  if (input.active !== undefined) data.active = Boolean(input.active);
  return prisma.quantityDiscount.update({ where: { id }, data });
}

export async function deleteQuantityDiscount(id: string) {
  await prisma.quantityDiscount.delete({ where: { id } });
}

// The discount % for a given total kg: the highest active tier whose minKg the
// order reaches. Returns 0 if none apply.
export function tierForKg(tiers: QuantityTier[], totalKg: number): number {
  let best = 0;
  for (const t of tiers) {
    if (t.active && totalKg >= t.minKg && t.discountPercent > best) {
      best = t.discountPercent;
    }
  }
  return best;
}

// Motivational info for the cart: current % and the next tier to aim for.
export type KgDiscountInfo = {
  totalKg: number;
  currentPercent: number;
  next: { minKg: number; discountPercent: number; kgAway: number } | null;
};

export function kgDiscountInfo(
  tiers: QuantityTier[],
  totalKg: number
): KgDiscountInfo {
  const active = tiers
    .filter((t) => t.active)
    .sort((a, b) => a.minKg - b.minKg);
  const currentPercent = tierForKg(active, totalKg);
  const next = active.find((t) => t.minKg > totalKg && t.discountPercent > currentPercent);
  return {
    totalKg,
    currentPercent,
    next: next
      ? {
          minKg: next.minKg,
          discountPercent: next.discountPercent,
          kgAway: Math.round((next.minKg - totalKg) * 100) / 100,
        }
      : null,
  };
}
