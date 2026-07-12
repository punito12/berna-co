// Smoke test del flujo de pedidos contra el dev server local + DB dev.
// Cubre: creación EFECTIVO con descuento por cantidad (matemática exacta),
// validaciones 400, descuento/restauración de stock vía cancelación, y la
// regresión de /pedido/error (no debe cancelar pedidos al visitarse).
//
// Requiere: dev server corriendo en localhost:3000 (npm run dev).
// Correr:   npm run smoke
//
// Auto-limpieza: todos los pedidos que crea quedan CANCELADOS al final y el
// stock vuelve a su estado inicial. Aborta si detecta que la DB no es dev.

import { readFileSync } from "fs";

// --- DATABASE_URL desde .env.local (la CLI pelada levantaría .env, que está
// desactualizado — gotcha conocido del repo). Antes de importar Prisma. ---
const envLocal = readFileSync(".env.local", "utf8");
const m = envLocal.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!m) throw new Error("No encontré DATABASE_URL en .env.local");
process.env.DATABASE_URL = m[1];

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  // Guardarraíl: solo contra la DB dev.
  if (!process.env.DATABASE_URL?.includes("ep-tiny-water")) {
    throw new Error(
      "DATABASE_URL no parece la DB dev (ep-tiny-water). Abortando por seguridad."
    );
  }

  // --- 1. Elegir un producto apto: sin promos, con precio efectivo y stock ≥ 6 ---
  const products = await prisma.product.findMany({ where: { available: true } });
  type Pick = { id: string; breadcrumb: string; cash: number; stock: number };
  let pick: Pick | null = null;
  for (const p of products) {
    const promoPct = JSON.parse((p as any).promoPercents || "{}");
    const promoTypes = JSON.parse((p as any).promoTypes || "{}");
    const stocks = JSON.parse(p.stocks || "{}");
    const cashPrices = JSON.parse((p as any).pricesCashTransfer || "{}");
    for (const [bc, st] of Object.entries(stocks)) {
      const cash = Number(cashPrices[bc] ?? (p as any).priceCashTransfer ?? 0);
      if (
        Number(st) >= 6 &&
        cash > 0 &&
        !Number(promoPct[bc] ?? p.promoPercent ?? 0) &&
        !(promoTypes[bc] ?? p.promoType ?? "")
      ) {
        pick = { id: p.id, breadcrumb: bc, cash, stock: Number(st) };
        break;
      }
    }
    if (pick) break;
  }
  if (!pick) throw new Error("Ningún producto con stock ≥ 6 sin promos para probar.");
  console.log(`Producto de prueba: ${pick.id} (${pick.breadcrumb}), stock ${pick.stock}, efectivo $${pick.cash}`);

  // --- 2. Fecha de retiro válida + tramos de descuento ---
  const opts = await fetch(`${BASE}/api/delivery-options?type=PICKUP`).then((r) => r.json());
  const enabled: number[] = opts.enabledWeekdays ?? [];
  const slot: string = opts.slots?.[0]?.label;
  if (!enabled.length || !slot) throw new Error("Sin opciones de retiro configuradas.");
  const d = new Date();
  for (let i = 1; i <= 8; i++) {
    d.setDate(d.getDate() + 1);
    if (enabled.includes(d.getDay())) break;
  }
  // Igual que el checkout real: mandar mediodía local ("T12:00:00"), no la
  // fecha pelada — el server parsea con new Date() y una medianoche UTC leída
  // en hora argentina cae en el día ANTERIOR (rechazaba días válidos).
  const dateIso = `${d.toLocaleDateString("en-CA")}T12:00:00`;

  const tiersResp = await fetch(`${BASE}/api/quantity-discounts`).then((r) => r.json());
  const tiers: { minKg: number; discountPercent: number }[] = tiersResp.tiers ?? [];
  const QTY = 5;
  const tierPct = tiers.reduce(
    (best, t) => (QTY >= t.minKg && t.discountPercent > best ? t.discountPercent : best),
    0
  );

  const basePayload = {
    customerName: "SMOKE TEST (auto)",
    customerPhone: "1100000000",
    deliveryType: "PICKUP",
    scheduledDate: dateIso,
    scheduledSlot: slot,
    paymentMethod: "EFECTIVO",
    items: [{ productId: pick.id, breadcrumbType: pick.breadcrumb, quantity: QTY }],
  };

  const createdIds: string[] = [];
  const post = (body: unknown) =>
    fetch(`${BASE}/api/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  try {
    // --- 3. Pedido EFECTIVO válido: 201 + matemática exacta + stock ---
    const r1 = await post(basePayload);
    const j1 = await r1.json();
    check("crear pedido EFECTIVO → 201", r1.status === 201, `status ${r1.status}`);
    if (j1.id) createdIds.push(j1.id);

    const order = j1.id
      ? await prisma.order.findUnique({ where: { id: j1.id } })
      : null;
    const expected = Math.round(pick.cash * QTY * (1 - tierPct / 100));
    check(
      `total = efectivo×${QTY} − ${tierPct}% cantidad`,
      order?.total === expected,
      `esperado $${expected}, guardado $${order?.total}`
    );
    check("estado CONFIRMED", order?.status === "CONFIRMED", String(order?.status));

    const afterCreate = await prisma.product.findUnique({
      where: { id: pick.id },
      select: { stocks: true },
    });
    const stockAfter = JSON.parse(afterCreate!.stocks || "{}")[pick.breadcrumb];
    check(`stock descontado (${pick.stock} → ${pick.stock - QTY})`, stockAfter === pick.stock - QTY, `quedó ${stockAfter}`);

    // --- 4. Validaciones: 400 claros ---
    const { customerName: _omit, ...noName } = basePayload;
    const r2 = await post(noName);
    check("sin nombre → 400", r2.status === 400);

    const r3 = await post({
      ...basePayload,
      items: [{ productId: pick.id, breadcrumbType: pick.breadcrumb, quantity: 9999 }],
    });
    check("cantidad > stock → 400", r3.status === 400);

    // --- 5. /pedido/error NO cancela pedidos (regresión P1-03) ---
    const errPage = await fetch(`${BASE}/pedido/error?id=${j1.id}`);
    const after = await prisma.order.findUnique({
      where: { id: j1.id },
      select: { status: true },
    });
    check(
      "visitar /pedido/error no cancela",
      errPage.status === 200 && after?.status === "CONFIRMED",
      String(after?.status)
    );

    // --- 6. Cancelación restaura stock exacto ---
    const { setSaleStatus } = await import("../lib/sale-actions");
    for (const id of createdIds) await setSaleStatus("ORDER", id, "CANCELLED");
    const final = await prisma.product.findUnique({
      where: { id: pick.id },
      select: { stocks: true },
    });
    const stockFinal = JSON.parse(final!.stocks || "{}")[pick.breadcrumb];
    check(`cancelar restaura stock (${pick.stock})`, stockFinal === pick.stock, `quedó ${stockFinal}`);
  } finally {
    // Limpieza defensiva por si algo quedó a mitad de camino.
    try {
      const { setSaleStatus } = await import("../lib/sale-actions");
      for (const id of createdIds) await setSaleStatus("ORDER", id, "CANCELLED").catch(() => {});
    } catch {}
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? "\nSMOKE OK" : `\nSMOKE FALLÓ (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
