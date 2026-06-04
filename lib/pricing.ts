// Costos y Precios (Catálogo). The master table is one row per
// (product × active empanado), with editable cost + public price and derived
// suggested price, channel prices and margins. Cost/price changes are logged to
// CostHistory / PriceHistory.

import { prisma } from "@/lib/db";
import { BREADCRUMB_LABELS } from "@/lib/products";

export const PRICING_SINGLETON_ID = "singleton";

// Sub-tabs for the Costos y Precios section (shared by its pages). Lives here
// (not in a page file) because Next.js forbids arbitrary named exports there.
export const COSTOS_TABS = [
  { href: "/admin/catalogo/costos", label: "Costos y Precios" },
  { href: "/admin/catalogo/costos/parametros", label: "Parámetros" },
  { href: "/admin/catalogo/costos/recetas", label: "Recetas" },
  { href: "/admin/catalogo/costos/competencia", label: "Competencia" },
  { href: "/admin/catalogo/costos/historico", label: "Histórico" },
];

export type PricingConfigValues = {
  sueldoPercent: number;
  utilidadPercent: number;
  descuentoMayoristaPercent: number;
  descuentoKioscoPercent: number;
};

// Read the singleton config, creating it with defaults on first access.
export async function getPricingConfig(): Promise<PricingConfigValues> {
  let cfg = await prisma.pricingConfig.findUnique({
    where: { id: PRICING_SINGLETON_ID },
  });
  if (!cfg) {
    cfg = await prisma.pricingConfig.create({
      data: { id: PRICING_SINGLETON_ID },
    });
  }
  return {
    sueldoPercent: cfg.sueldoPercent,
    utilidadPercent: cfg.utilidadPercent,
    descuentoMayoristaPercent: cfg.descuentoMayoristaPercent,
    descuentoKioscoPercent: cfg.descuentoKioscoPercent,
  };
}

export async function updatePricingConfig(
  input: PricingConfigValues
): Promise<void> {
  const clean = (n: number) => Math.max(0, Math.round(Number(n) || 0));
  await prisma.pricingConfig.upsert({
    where: { id: PRICING_SINGLETON_ID },
    update: {
      sueldoPercent: clean(input.sueldoPercent),
      utilidadPercent: clean(input.utilidadPercent),
      descuentoMayoristaPercent: clean(input.descuentoMayoristaPercent),
      descuentoKioscoPercent: clean(input.descuentoKioscoPercent),
    },
    create: {
      id: PRICING_SINGLETON_ID,
      sueldoPercent: clean(input.sueldoPercent),
      utilidadPercent: clean(input.utilidadPercent),
      descuentoMayoristaPercent: clean(input.descuentoMayoristaPercent),
      descuentoKioscoPercent: clean(input.descuentoKioscoPercent),
    },
  });
}

// ---- Master table -----------------------------------------------------------

export type PricingRow = {
  productId: string;
  productName: string;
  breadcrumbType: string;
  breadcrumbLabel: string;
  cost: number; // cost per kg (pesos)
  costFromRecipe: boolean; // true → cost is driven by an active recipe (read-only)
  suggestedPrice: number; // cost × (1 + sueldo% + utilidad%)
  publicPrice: number; // editable
  mayoristaPrice: number; // derived
  kioscoPrice: number; // derived
  marginMinorista: { pesos: number; pct: number };
  marginMayorista: { pesos: number; pct: number };
  marginKiosco: { pesos: number; pct: number };
};

function parseMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
function parseArr(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function margin(price: number, cost: number): { pesos: number; pct: number } {
  const pesos = price - cost;
  const pct = price > 0 ? (pesos / price) * 100 : 0;
  return { pesos, pct };
}

export async function buildPricingTable(): Promise<{
  config: PricingConfigValues;
  rows: PricingRow[];
}> {
  const config = await getPricingConfig();
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { recipes: { where: { active: true } } },
  });

  const suggestMul = 1 + config.sueldoPercent / 100 + config.utilidadPercent / 100;
  const mayMul = 1 - config.descuentoMayoristaPercent / 100;
  const kioMul = 1 - config.descuentoKioscoPercent / 100;

  const rows: PricingRow[] = [];
  for (const p of products) {
    const available = parseArr(p.availableBreadcrumbs);
    const disabled = new Set(parseArr(p.disabledBreadcrumbs));
    const prices = parseMap(p.prices);
    const costs = parseMap(p.costs);
    const activeRecipeBcs = new Set(p.recipes.map((r) => r.breadcrumbType));

    for (const bc of available) {
      if (disabled.has(bc)) continue; // skip disabled empanados
      const cost = costs[bc] ?? 0;
      const publicPrice = prices[bc] ?? p.price ?? 0;
      const suggestedPrice = Math.round(cost * suggestMul);
      const mayoristaPrice = Math.round(publicPrice * mayMul);
      const kioscoPrice = Math.round(publicPrice * kioMul);
      rows.push({
        productId: p.id,
        productName: p.name,
        breadcrumbType: bc,
        breadcrumbLabel: BREADCRUMB_LABELS[bc] ?? bc,
        cost,
        costFromRecipe: activeRecipeBcs.has(bc),
        suggestedPrice,
        publicPrice,
        mayoristaPrice,
        kioscoPrice,
        marginMinorista: margin(publicPrice, cost),
        marginMayorista: margin(mayoristaPrice, cost),
        marginKiosco: margin(kioscoPrice, cost),
      });
    }
  }
  return { config, rows };
}

// ---- Inline edits (with history) -------------------------------------------

// Set the cost for one (product, empanado), update Product.costs + costPerKg
// fallback, and log CostHistory. Refuses if an active recipe drives the cost.
export async function setProductCost(
  productId: string,
  breadcrumbType: string,
  cost: number,
  opts: { allowRecipeOverride?: boolean } = {}
): Promise<void> {
  const value = Math.max(0, Math.round(Number(cost) || 0));
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { costs: true, recipes: { where: { breadcrumbType, active: true } } },
  });
  if (!product) throw new Error("Producto no encontrado.");
  if (product.recipes.length > 0 && !opts.allowRecipeOverride)
    throw new Error("El costo viene de una receta activa; editá la receta.");

  const costs = parseMap(product.costs);
  if (costs[breadcrumbType] === value) return; // no change
  costs[breadcrumbType] = value;

  await prisma.product.update({
    where: { id: productId },
    data: { costs: JSON.stringify(costs) },
  });
  await prisma.costHistory.create({
    data: { productId, breadcrumbType, costPerKg: value },
  });
}

// Set the public price for one (product, empanado), update Product.prices and
// log PriceHistory (channel PUBLICO).
export async function setPublicPrice(
  productId: string,
  breadcrumbType: string,
  price: number
): Promise<void> {
  const value = Math.max(0, Math.round(Number(price) || 0));
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { prices: true },
  });
  if (!product) throw new Error("Producto no encontrado.");
  const prices = parseMap(product.prices);
  if (prices[breadcrumbType] === value) return;
  prices[breadcrumbType] = value;
  await prisma.product.update({
    where: { id: productId },
    data: { prices: JSON.stringify(prices) },
  });
  await prisma.priceHistory.create({
    data: { productId, breadcrumbType, channel: "PUBLICO", price: value },
  });
}

// Copy the suggested price → public price for every row (bulk action).
export async function applyAllSuggested(): Promise<number> {
  const { rows } = await buildPricingTable();
  let changed = 0;
  for (const r of rows) {
    if (r.suggestedPrice > 0 && r.suggestedPrice !== r.publicPrice) {
      await setPublicPrice(r.productId, r.breadcrumbType, r.suggestedPrice);
      changed += 1;
    }
  }
  return changed;
}
