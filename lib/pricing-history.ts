// Histórico (Costos y Precios → Histórico). For a product+empanado, the cost and
// public-price changes over time, plus derived channel prices for the chart.

import { prisma } from "@/lib/db";
import { getPricingConfig } from "@/lib/pricing";

export type HistoryPoint = {
  date: string; // ISO date (for the chart axis)
  ts: number;
  costo: number | null;
  publico: number | null;
  mayorista: number | null;
  kiosco: number | null;
};

export type HistoryChange = {
  id: string;
  changedAt: Date;
  field: string; // "Costo" | "Precio público"
  value: number;
  previous: number | null; // prior value of the same field
};

export async function getPriceHistory(
  productId: string,
  breadcrumbType: string,
  from?: Date,
  to?: Date
): Promise<{ points: HistoryPoint[]; changes: HistoryChange[] }> {
  const dateFilter =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lt: to } : {}),
        }
      : undefined;

  const [costs, prices, config] = await Promise.all([
    prisma.costHistory.findMany({
      where: { productId, breadcrumbType, ...(dateFilter ? { changedAt: dateFilter } : {}) },
      orderBy: { changedAt: "asc" },
    }),
    prisma.priceHistory.findMany({
      where: {
        productId,
        breadcrumbType,
        channel: "PUBLICO",
        ...(dateFilter ? { changedAt: dateFilter } : {}),
      },
      orderBy: { changedAt: "asc" },
    }),
    getPricingConfig(),
  ]);

  const mayMul = 1 - config.descuentoMayoristaPercent / 100;
  const kioMul = 1 - config.descuentoKioscoPercent / 100;

  // Merge both series by timestamp; carry the last known cost/public price
  // forward so the lines are continuous.
  type Row = { ts: number; date: string; costo?: number; publico?: number };
  const byTs = new Map<number, Row>();
  for (const c of costs) {
    const ts = c.changedAt.getTime();
    const r = byTs.get(ts) ?? { ts, date: c.changedAt.toISOString() };
    r.costo = c.costPerKg;
    byTs.set(ts, r);
  }
  for (const pr of prices) {
    const ts = pr.changedAt.getTime();
    const r = byTs.get(ts) ?? { ts, date: pr.changedAt.toISOString() };
    r.publico = pr.price;
    byTs.set(ts, r);
  }

  const ordered = [...byTs.values()].sort((a, b) => a.ts - b.ts);
  let lastCost: number | null = null;
  let lastPublic: number | null = null;
  const points: HistoryPoint[] = ordered.map((r) => {
    if (r.costo !== undefined) lastCost = r.costo;
    if (r.publico !== undefined) lastPublic = r.publico;
    const publico = lastPublic;
    return {
      date: r.date.slice(0, 10),
      ts: r.ts,
      costo: lastCost,
      publico,
      mayorista: publico !== null ? Math.round(publico * mayMul) : null,
      kiosco: publico !== null ? Math.round(publico * kioMul) : null,
    };
  });

  // `previous` = the prior value of the same field (costs/prices arrive sorted
  // ascending, so index-1 is the previous value).
  const costChanges: HistoryChange[] = costs.map((c, i) => ({
    id: c.id,
    changedAt: c.changedAt,
    field: "Costo",
    value: c.costPerKg,
    previous: i > 0 ? costs[i - 1].costPerKg : null,
  }));
  const priceChanges: HistoryChange[] = prices.map((pr, i) => ({
    id: pr.id,
    changedAt: pr.changedAt,
    field: "Precio público",
    value: pr.price,
    previous: i > 0 ? prices[i - 1].price : null,
  }));
  const changes = [...costChanges, ...priceChanges].sort(
    (a, b) => b.changedAt.getTime() - a.changedAt.getTime()
  );

  return { points, changes };
}

// Products + their active empanados, for the selector.
export async function listProductBreadcrumbs() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => {
    let breadcrumbs: string[] = [];
    try {
      const b = JSON.parse(p.availableBreadcrumbs);
      breadcrumbs = Array.isArray(b) ? b : [];
    } catch {}
    return { id: p.id, name: p.name, breadcrumbs };
  });
}
