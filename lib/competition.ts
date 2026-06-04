// Competencia (Costos y Precios → Competencia). Free-text competitor prices per
// kg, plus a comparison of my public price vs the competitors' average for each
// of my products.

import { prisma } from "@/lib/db";

export type CompetitorInput = {
  productName: string;
  competitor: string;
  pricePerKg: number;
};

function clean(input: CompetitorInput) {
  const productName = input.productName?.trim();
  if (!productName) throw new Error("Poné el nombre del producto.");
  const competitor = input.competitor?.trim();
  if (!competitor) throw new Error("Poné el nombre del competidor.");
  const pricePerKg = Math.max(0, Math.round(Number(input.pricePerKg) || 0));
  if (pricePerKg <= 0) throw new Error("El precio tiene que ser mayor a 0.");
  return { productName, competitor, pricePerKg };
}

export async function listCompetitorPrices() {
  return prisma.competitorPrice.findMany({ orderBy: { productName: "asc" } });
}

export async function createCompetitorPrice(input: CompetitorInput) {
  return prisma.competitorPrice.create({ data: clean(input) });
}

export async function updateCompetitorPrice(id: string, input: CompetitorInput) {
  return prisma.competitorPrice.update({ where: { id }, data: clean(input) });
}

export async function deleteCompetitorPrice(id: string) {
  await prisma.competitorPrice.delete({ where: { id } });
}

// Product names (for the free-text autocomplete suggestions).
export async function listProductNames(): Promise<string[]> {
  const products = await prisma.product.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return products.map((p) => p.name);
}

// Comparison: my (highest) public price per product vs the average competitor
// price, with the difference. `position`: BELOW (cheaper), ABOVE (>15% over),
// or NEAR.
export type ComparisonRow = {
  productName: string;
  myPrice: number; // my public price (max across empanados)
  competitorAvg: number;
  competitorsCount: number;
  diffPesos: number; // myPrice - avg
  diffPct: number;
  position: "BELOW" | "NEAR" | "ABOVE";
};

function parseMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export async function getComparison(): Promise<ComparisonRow[]> {
  const [products, competitors] = await Promise.all([
    prisma.product.findMany({ select: { name: true, price: true, prices: true } }),
    prisma.competitorPrice.findMany(),
  ]);

  // Group competitor prices by normalized product name.
  const norm = (s: string) => s.trim().toLowerCase();
  const byName = new Map<string, number[]>();
  for (const c of competitors) {
    const key = norm(c.productName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(c.pricePerKg);
  }

  const rows: ComparisonRow[] = [];
  for (const p of products) {
    const prices = Object.values(parseMap(p.prices));
    const myPrice = prices.length ? Math.max(...prices) : p.price;
    const comp = byName.get(norm(p.name));
    if (!comp || comp.length === 0) continue; // only products with competitor data
    const avg = Math.round(comp.reduce((a, b) => a + b, 0) / comp.length);
    const diffPesos = myPrice - avg;
    const diffPct = avg > 0 ? (diffPesos / avg) * 100 : 0;
    const position: ComparisonRow["position"] =
      diffPct < 0 ? "BELOW" : diffPct > 15 ? "ABOVE" : "NEAR";
    rows.push({
      productName: p.name,
      myPrice,
      competitorAvg: avg,
      competitorsCount: comp.length,
      diffPesos,
      diffPct,
      position,
    });
  }
  return rows.sort((a, b) => a.productName.localeCompare(b.productName));
}
