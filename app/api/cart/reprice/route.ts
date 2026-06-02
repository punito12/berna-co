import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { priceFor, type ProductForUI } from "@/lib/products";

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
    // Reuse the storefront mapping for promo-aware pricing.
    const ui = {
      price: p.price,
      pricesByBreadcrumb: safeMap(p.prices),
      promoPercent: p.promoPercent,
    } as unknown as ProductForUI;
    const base = priceFor(ui, line.breadcrumbType);
    const unitPrice =
      p.promoPercent > 0
        ? Math.round((base * (100 - p.promoPercent)) / 100)
        : base;
    prices[key] = { unitPrice, promoType: p.promoType ?? "", available: true };
  }

  return NextResponse.json({ prices });
}

function safeMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
