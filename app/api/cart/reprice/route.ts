import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  promoPriceFor,
  promoTypeFor,
  type ProductForUI,
} from "@/lib/products";

// Public: given cart lines (productId + empanado), returns the CURRENT unit
// price (with the product's % promo) and promoType, so the checkout always
// shows live amounts even if the cart was filled before a promo changed.
//
// POST { lines: [{ productId, breadcrumbType }] }
//   -> { prices: { "<productId>__<breadcrumb>": { unitPrice, promoType, available } } }
export async function POST(request: Request) {
  let body: { lines?: { productId: string; breadcrumbType: string }[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const lines = body.lines ?? [];
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const prices: Record<
    string,
    { unitPrice: number; promoType: string; available: boolean }
  > = {};

  for (const line of lines) {
    const key = `${line.productId}__${line.breadcrumbType}`;
    const p = byId.get(line.productId);
    if (!p || !p.available) {
      prices[key] = { unitPrice: 0, promoType: "", available: false };
      continue;
    }
    // Build a promo-aware UI shape and reuse the storefront helpers so the
    // per-empanado promos are honored.
    const ui = {
      price: p.price,
      pricesByBreadcrumb: safeMap(p.prices),
      promoPercent: p.promoPercent,
      promoType: p.promoType,
      promoPercentByBreadcrumb: safeMap(p.promoPercents),
      promoTypeByBreadcrumb: safeStrMap(p.promoTypes),
    } as unknown as ProductForUI;
    prices[key] = {
      unitPrice: promoPriceFor(ui, line.breadcrumbType),
      promoType: promoTypeFor(ui, line.breadcrumbType),
      available: true,
    };
  }

  return NextResponse.json({ prices });
}

function safeStrMap(raw: string): Record<string, string> {
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v))
      if (typeof val === "string") out[k] = val;
    return out;
  } catch {
    return {};
  }
}

function safeMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
