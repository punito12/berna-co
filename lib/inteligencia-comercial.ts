// Inteligencia Comercial: comparador ejecutivo de períodos (A = base, B =
// actual). Corre el MISMO reporte canónico de ventas (buildSalesReport) para
// cada período y el reporte de analytics web, y arma todas las comparaciones:
// KPIs con delta, mix por canal/clase, productos, cortes, clientes (nuevos/
// perdidos/rankings), medios de pago, descuentos, funnel web, descomposición
// del crecimiento e insights automáticos. SOLO LECTURA. Sin métricas de
// costos/márgenes (el admin no gestiona costos completos todavía).

import {
  buildSalesReport,
  arDayStart,
  arDayEndExclusive,
  pricePerKg,
  type SalesReport,
  type ReportFilters,
} from "@/lib/sales-report";
import { buildAnalyticsReport, type AnalyticsReport } from "@/lib/analytics";
import { normalizeClientName } from "@/lib/clients";

// ---- Tipos ----

export type PeriodRange = { from: string; to: string }; // yyyy-mm-dd inclusivo

// Delta B vs A. pct = null cuando A es 0 (no hay base → "nuevo"/"—").
export type Delta = {
  a: number;
  b: number;
  abs: number;
  pct: number | null;
  dir: "up" | "down" | "flat";
};

export function delta(a: number, b: number): Delta {
  const abs = b - a;
  const pct = a !== 0 ? Math.round((abs / Math.abs(a)) * 1000) / 10 : null;
  const dir = abs > 0 ? "up" : abs < 0 ? "down" : "flat";
  return { a, b, abs, pct, dir };
}

export type KpiComparison = {
  key: string;
  label: string;
  format: "money" | "kg" | "int" | "pct";
  hint?: string;
  d: Delta;
};

export type ClassMixComparison = {
  class: "MAYORISTA" | "MINORISTA";
  label: string;
  net: Delta;
  kgEq: Delta;
  units: Delta; // kg + paquetes
  netShareA: number; // % del neto total del período A
  netShareB: number;
  netSharePp: number; // puntos porcentuales de cambio
  unitShareA: number;
  unitShareB: number;
  unitSharePp: number;
  pricePerKgA: number;
  pricePerKgB: number;
};

export type OriginComparison = {
  kind: string;
  label: string;
  count: Delta;
  net: Delta;
  kgEq: Delta;
  netShareA: number;
  netShareB: number;
  netSharePp: number;
};

export type ProductComparison = {
  productId: string;
  name: string;
  net: Delta;
  kgEq: Delta;
  packs: Delta;
  pricePerKgA: number;
  pricePerKgB: number;
  netShareB: number; // % del neto total B
  kgShareB: number;
  rankA: number | null; // por neta; null = sin ventas en ese período
  rankB: number | null;
};

export type CorteComparison = {
  corte: string;
  kgEq: Delta;
  net: Delta;
  kgShareA: number;
  kgShareB: number;
  pricePerKgA: number;
  pricePerKgB: number;
};

export type ClientComparison = {
  key: string;
  name: string;
  type: string;
  net: Delta;
  purchases: Delta;
  avgTicketA: number;
  avgTicketB: number;
  netShareB: number;
  rankA: number | null;
  rankB: number | null;
  status: "nuevo" | "perdido" | "retenido";
};

export type PaymentComparison = {
  method: string;
  label: string;
  count: Delta;
  sold: Delta;
  collected: Delta;
  pending: Delta;
};

export type FunnelStepComparison = {
  step: string;
  label: string;
  d: Delta;
};

export type Insight = {
  tone: "up" | "down" | "warn" | "neutral";
  text: string;
};

export type GrowthDecomposition = {
  revenueDelta: number;
  // ΔRev = efecto volumen + efecto precio/mix (algebraicamente exacto):
  // (kgB − kgA) × precioA  +  (precioB − precioA) × kgB
  volumeEffect: number;
  priceMixEffect: number;
  // ΔRev = efecto cantidad de ventas + efecto ticket:
  // (nB − nA) × ticketA  +  nB × (ticketB − ticketA)
  countEffect: number;
  ticketEffect: number;
};

export type ComparisonReport = {
  periodA: PeriodRange;
  periodB: PeriodRange;
  hasDataA: boolean;
  hasDataB: boolean;
  reportA: SalesReport;
  reportB: SalesReport;
  kpis: KpiComparison[];
  growth: GrowthDecomposition;
  classMix: ClassMixComparison[];
  origins: OriginComparison[];
  products: ProductComparison[];
  cortes: CorteComparison[];
  clients: ClientComparison[];
  newClients: ClientComparison[];
  lostClients: ClientComparison[];
  payments: PaymentComparison[];
  discounts: {
    total: Delta;
    rateA: number; // % de descuento sobre bruta
    rateB: number;
    ratePp: number;
  };
  analytics: {
    hasData: boolean;
    funnel: FunnelStepComparison[];
    sessions: Delta;
    conversion: Delta; // % pedido/sesión
    campaignsB: AnalyticsReport["campaigns"];
    localitiesB: AnalyticsReport["localities"];
  };
  insights: Insight[];
};

// ---- Helpers ----

function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clientKeyOf(customerId: string | null, name: string): string {
  return customerId ?? `name:${normalizeClientName(name)}`;
}

// ---- Motor de comparación ----

export async function comparePeriods(
  periodA: PeriodRange,
  periodB: PeriodRange
): Promise<ComparisonReport> {
  const filtersA: ReportFilters = {
    from: arDayStart(periodA.from),
    to: arDayEndExclusive(periodA.to),
  };
  const filtersB: ReportFilters = {
    from: arDayStart(periodB.from),
    to: arDayEndExclusive(periodB.to),
  };

  const [reportA, reportB, anaA, anaB] = await Promise.all([
    buildSalesReport(filtersA),
    buildSalesReport(filtersB),
    buildAnalyticsReport(filtersA.from, filtersA.to),
    buildAnalyticsReport(filtersB.from, filtersB.to),
  ]);

  const gA = reportA.general;
  const gB = reportB.general;

  // --- clientes: sets por período para nuevos/perdidos/retenidos ---
  const clientsA = new Map(
    reportA.customers.map((c, i) => [clientKeyOf(c.customerId, c.name), { ...c, rank: i + 1 }])
  );
  const clientsB = new Map(
    reportB.customers.map((c, i) => [clientKeyOf(c.customerId, c.name), { ...c, rank: i + 1 }])
  );

  const allClientKeys = new Set([...clientsA.keys(), ...clientsB.keys()]);
  const clients: ClientComparison[] = [...allClientKeys].map((key) => {
    const a = clientsA.get(key);
    const b = clientsB.get(key);
    const status: ClientComparison["status"] = a && b ? "retenido" : b ? "nuevo" : "perdido";
    return {
      key,
      name: b?.name ?? a?.name ?? "Cliente",
      type: b?.type ?? a?.type ?? "MINORISTA",
      net: delta(a?.net ?? 0, b?.net ?? 0),
      purchases: delta(a?.purchases ?? 0, b?.purchases ?? 0),
      avgTicketA: a && a.purchases > 0 ? Math.round(a.net / a.purchases) : 0,
      avgTicketB: b && b.purchases > 0 ? Math.round(b.net / b.purchases) : 0,
      netShareB: share(b?.net ?? 0, gB.net),
      rankA: a?.rank ?? null,
      rankB: b?.rank ?? null,
      status,
    };
  });
  clients.sort((x, y) => y.net.b - x.net.b || y.net.a - x.net.a);
  const newClients = clients.filter((c) => c.status === "nuevo" && c.net.b > 0);
  const lostClients = clients
    .filter((c) => c.status === "perdido" && c.net.a > 0)
    .sort((x, y) => y.net.a - x.net.a);

  const activeClientsD = delta(reportA.customers.length, reportB.customers.length);

  // --- KPIs ejecutivos ---
  const avgTicketA = gA.salesCount > 0 ? Math.round(gA.net / gA.salesCount) : 0;
  const avgTicketB = gB.salesCount > 0 ? Math.round(gB.net / gB.salesCount) : 0;
  const originOf = (r: SalesReport, kind: string) =>
    r.byOrigin.find((o) => o.kind === kind);

  const kpis: KpiComparison[] = [
    { key: "net", label: "Facturación neta", format: "money", d: delta(gA.net, gB.net) },
    { key: "gross", label: "Facturación bruta", format: "money", d: delta(gA.gross, gB.gross) },
    { key: "discount", label: "Descuentos", format: "money", d: delta(gA.discount, gB.discount) },
    { key: "kgEq", label: "Kg equivalentes", format: "kg", hint: "incluye paquetes convertidos", d: delta(gA.kgEq, gB.kgEq) },
    { key: "kg", label: "Kg (productos de 1 kg)", format: "kg", d: delta(gA.kg, gB.kg) },
    { key: "packs", label: "Paquetes", format: "int", d: delta(gA.packs, gB.packs) },
    { key: "sales", label: "Cantidad de ventas", format: "int", d: delta(gA.salesCount, gB.salesCount) },
    { key: "ticket", label: "Ticket promedio", format: "money", d: delta(avgTicketA, avgTicketB) },
    { key: "ticketMin", label: "Ticket prom. minorista", format: "money", hint: "solo ventas minoristas", d: delta(gA.avgTicketMinorista, gB.avgTicketMinorista) },
    { key: "priceKg", label: "Precio promedio/kg", format: "money", hint: "sobre kg equivalentes", d: delta(gA.avgPricePerKg, gB.avgPricePerKg) },
    { key: "clients", label: "Clientes activos", format: "int", d: activeClientsD },
    { key: "newClients", label: "Clientes nuevos", format: "int", hint: "compraron en B, no en A", d: delta(0, newClients.length) },
    { key: "web", label: "Pedidos web", format: "int", d: delta(originOf(reportA, "ORDER")?.count ?? 0, originOf(reportB, "ORDER")?.count ?? 0) },
    { key: "manual", label: "Ventas manuales", format: "int", d: delta(originOf(reportA, "MANUAL")?.count ?? 0, originOf(reportB, "MANUAL")?.count ?? 0) },
    { key: "remito", label: "Remitos", format: "int", d: delta(originOf(reportA, "REMITO")?.count ?? 0, originOf(reportB, "REMITO")?.count ?? 0) },
  ];
  if (anaA.hasData || anaB.hasData) {
    kpis.push({
      key: "webConv",
      label: "Conversión web",
      format: "pct",
      hint: "pedidos / sesiones",
      d: delta(anaA.kpis.conversionRate, anaB.kpis.conversionRate),
    });
  }

  // --- descomposición del crecimiento ---
  const revenueDelta = gB.net - gA.net;
  const volumeEffect = Math.round((gB.kgEq - gA.kgEq) * gA.avgPricePerKg);
  const priceMixEffect = revenueDelta - volumeEffect; // exacto por construcción
  const countEffect = Math.round((gB.salesCount - gA.salesCount) * avgTicketA);
  const ticketEffect = revenueDelta - countEffect;
  const growth: GrowthDecomposition = {
    revenueDelta,
    volumeEffect,
    priceMixEffect,
    countEffect,
    ticketEffect,
  };

  // --- mix mayorista / minorista ---
  const unitsOf = (r: SalesReport, cls: string) => {
    const row = r.byCustomerClass.find((c) => c.class === cls)?.row;
    return row ? row.kg + row.packs : 0;
  };
  const totalUnitsA = unitsOf(reportA, "MAYORISTA") + unitsOf(reportA, "MINORISTA");
  const totalUnitsB = unitsOf(reportB, "MAYORISTA") + unitsOf(reportB, "MINORISTA");
  const classMix: ClassMixComparison[] = (["MAYORISTA", "MINORISTA"] as const).map(
    (cls) => {
      const a = reportA.byCustomerClass.find((c) => c.class === cls)?.row;
      const b = reportB.byCustomerClass.find((c) => c.class === cls)?.row;
      const netShareA = share(a?.net ?? 0, gA.net);
      const netShareB = share(b?.net ?? 0, gB.net);
      const unitShareA = share(unitsOf(reportA, cls), totalUnitsA);
      const unitShareB = share(unitsOf(reportB, cls), totalUnitsB);
      return {
        class: cls,
        label: cls === "MAYORISTA" ? "Mayorista" : "Minorista",
        net: delta(a?.net ?? 0, b?.net ?? 0),
        kgEq: delta(a?.kgEq ?? 0, b?.kgEq ?? 0),
        units: delta(unitsOf(reportA, cls), unitsOf(reportB, cls)),
        netShareA,
        netShareB,
        netSharePp: round1(netShareB - netShareA),
        unitShareA,
        unitShareB,
        unitSharePp: round1(unitShareB - unitShareA),
        pricePerKgA: a ? pricePerKg(a) : 0,
        pricePerKgB: b ? pricePerKg(b) : 0,
      };
    }
  );

  // --- por origen ---
  const origins: OriginComparison[] = (["ORDER", "MANUAL", "REMITO"] as const).map(
    (kind) => {
      const a = originOf(reportA, kind);
      const b = originOf(reportB, kind);
      const netShareA = share(a?.net ?? 0, gA.net);
      const netShareB = share(b?.net ?? 0, gB.net);
      return {
        kind,
        label: b?.label ?? a?.label ?? kind,
        count: delta(a?.count ?? 0, b?.count ?? 0),
        net: delta(a?.net ?? 0, b?.net ?? 0),
        kgEq: delta(a?.kgEq ?? 0, b?.kgEq ?? 0),
        netShareA,
        netShareB,
        netSharePp: round1(netShareB - netShareA),
      };
    }
  );

  // --- productos (join por clave producto+empanado, misma clave canónica) ---
  const prodA = new Map(reportA.byProduct.map((p, i) => [p.productId, { ...p, rank: i + 1 }]));
  const prodB = new Map(reportB.byProduct.map((p, i) => [p.productId, { ...p, rank: i + 1 }]));
  const allProdKeys = new Set([...prodA.keys(), ...prodB.keys()]);
  const products: ProductComparison[] = [...allProdKeys].map((pid) => {
    const a = prodA.get(pid);
    const b = prodB.get(pid);
    return {
      productId: pid,
      name: b?.name ?? a?.name ?? "Producto",
      net: delta(a?.net ?? 0, b?.net ?? 0),
      kgEq: delta(a?.kgEq ?? 0, b?.kgEq ?? 0),
      packs: delta(a?.packs ?? 0, b?.packs ?? 0),
      pricePerKgA: a ? pricePerKg(a) : 0,
      pricePerKgB: b ? pricePerKg(b) : 0,
      netShareB: share(b?.net ?? 0, gB.net),
      kgShareB: share(b?.kgEq ?? 0, gB.kgEq),
      rankA: a?.rank ?? null,
      rankB: b?.rank ?? null,
    };
  });
  products.sort((x, y) => y.net.b - x.net.b || y.net.a - x.net.a);

  // --- cortes ---
  const corteA = new Map(reportA.corteKg.map((c) => [c.corte, c]));
  const cortes: CorteComparison[] = reportB.corteKg.map((cB) => {
    const cA = corteA.get(cB.corte) ?? { corte: cB.corte, kgEq: 0, net: 0 };
    return {
      corte: cB.corte,
      kgEq: delta(cA.kgEq, cB.kgEq),
      net: delta(cA.net, cB.net),
      kgShareA: share(cA.kgEq, gA.kgEq),
      kgShareB: share(cB.kgEq, gB.kgEq),
      pricePerKgA: cA.kgEq > 0 ? Math.round(cA.net / cA.kgEq) : 0,
      pricePerKgB: cB.kgEq > 0 ? Math.round(cB.net / cB.kgEq) : 0,
    };
  });

  // --- medios de pago ---
  const payA = new Map(reportA.payments.map((p) => [p.method, p]));
  const payB = new Map(reportB.payments.map((p) => [p.method, p]));
  const allPayKeys = new Set([...payA.keys(), ...payB.keys()]);
  const payments: PaymentComparison[] = [...allPayKeys]
    .map((m) => {
      const a = payA.get(m);
      const b = payB.get(m);
      return {
        method: m,
        label: b?.label ?? a?.label ?? m,
        count: delta(a?.count ?? 0, b?.count ?? 0),
        sold: delta(a?.sold ?? 0, b?.sold ?? 0),
        collected: delta(a?.collected ?? 0, b?.collected ?? 0),
        pending: delta(a?.pending ?? 0, b?.pending ?? 0),
      };
    })
    .sort((x, y) => y.sold.b - x.sold.b);

  // --- descuentos ---
  const rateA = share(gA.discount, gA.gross);
  const rateB = share(gB.discount, gB.gross);
  const discounts = {
    total: delta(gA.discount, gB.discount),
    rateA,
    rateB,
    ratePp: round1(rateB - rateA),
  };

  // --- funnel web (analytics) ---
  const funnelSteps = [
    { step: "page_view", label: "Páginas vistas", a: anaA.kpis.pageViews, b: anaB.kpis.pageViews },
    { step: "product_view", label: "Vieron producto", a: anaA.kpis.productViews, b: anaB.kpis.productViews },
    { step: "add_to_cart", label: "Agregaron al carrito", a: anaA.kpis.addToCart, b: anaB.kpis.addToCart },
    { step: "begin_checkout", label: "Iniciaron checkout", a: anaA.kpis.beginCheckout, b: anaB.kpis.beginCheckout },
    { step: "order_created", label: "Crearon pedido", a: anaA.kpis.orders, b: anaB.kpis.orders },
  ];
  const analytics = {
    hasData: anaA.hasData || anaB.hasData,
    funnel: funnelSteps.map((s) => ({ step: s.step, label: s.label, d: delta(s.a, s.b) })),
    sessions: delta(anaA.kpis.sessions, anaB.kpis.sessions),
    conversion: delta(anaA.kpis.conversionRate, anaB.kpis.conversionRate),
    campaignsB: anaB.campaigns,
    localitiesB: anaB.localities,
  };

  // --- insights automáticos (motor de reglas, basado SOLO en datos) ---
  const insights = buildInsights({
    gA,
    gB,
    growth,
    classMix,
    cortes,
    clients,
    newClients,
    lostClients,
    products,
    discounts,
    analytics,
  });

  return {
    periodA,
    periodB,
    hasDataA: reportA.hasData,
    hasDataB: reportB.hasData,
    reportA,
    reportB,
    kpis,
    growth,
    classMix,
    origins,
    products,
    cortes,
    clients,
    newClients,
    lostClients,
    payments,
    discounts,
    analytics,
    insights,
  };
}

// ---- Motor de insights (reglas simples, sin inventar datos) ----

function fmtM(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtPct(p: number | null): string {
  if (p === null) return "nuevo";
  const s = p >= 0 ? "+" : "";
  return `${s}${p.toFixed(1).replace(".", ",")}%`;
}
function fmtKgN(n: number): string {
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg`;
}

function buildInsights(args: {
  gA: SalesReport["general"];
  gB: SalesReport["general"];
  growth: GrowthDecomposition;
  classMix: ClassMixComparison[];
  cortes: CorteComparison[];
  clients: ClientComparison[];
  newClients: ClientComparison[];
  lostClients: ClientComparison[];
  products: ProductComparison[];
  discounts: { total: Delta; rateA: number; rateB: number; ratePp: number };
  analytics: ComparisonReport["analytics"];
}): Insight[] {
  const { gA, gB, growth, classMix, cortes, clients, newClients, lostClients, products, discounts, analytics } = args;
  const out: Insight[] = [];
  if (gA.net === 0 && gB.net === 0) return out;

  const netD = delta(gA.net, gB.net);
  const kgD = delta(gA.kgEq, gB.kgEq);

  // 1. Divergencia facturación vs volumen (precio/mix como driver).
  if (netD.pct !== null && kgD.pct !== null) {
    if (netD.pct > 1 && kgD.pct < -1) {
      out.push({
        tone: "up",
        text: `La facturación neta creció ${fmtPct(netD.pct)} aunque los kg cayeron ${fmtPct(kgD.pct)}: el aumento de precio promedio/kg (${fmtM(gA.avgPricePerKg)} → ${fmtM(gB.avgPricePerKg)}) sostuvo el ingreso.`,
      });
    } else if (netD.pct < -1 && kgD.pct > 1) {
      out.push({
        tone: "warn",
        text: `Los kg crecieron ${fmtPct(kgD.pct)} pero la facturación cayó ${fmtPct(netD.pct)}: el precio/mix se debilitó (${fmtM(gA.avgPricePerKg)} → ${fmtM(gB.avgPricePerKg)}/kg).`,
      });
    } else if (Math.abs(netD.pct) > 1) {
      const driver = Math.abs(growth.volumeEffect) >= Math.abs(growth.priceMixEffect) ? "el volumen" : "el precio/mix";
      out.push({
        tone: netD.pct > 0 ? "up" : "down",
        text: `La facturación neta ${netD.pct > 0 ? "creció" : "cayó"} ${fmtPct(netD.pct)} (${fmtM(netD.abs)}), explicada principalmente por ${driver} (volumen ${fmtM(growth.volumeEffect)} · precio/mix ${fmtM(growth.priceMixEffect)}).`,
      });
    }
  }

  // 2. Ventas vs ticket.
  const salesD = delta(gA.salesCount, gB.salesCount);
  const tA = gA.salesCount > 0 ? gA.net / gA.salesCount : 0;
  const tB = gB.salesCount > 0 ? gB.net / gB.salesCount : 0;
  if (salesD.pct !== null && salesD.pct > 5 && tB < tA * 0.95) {
    out.push({
      tone: "neutral",
      text: `Hubo más ventas (${fmtPct(salesD.pct)}) pero con ticket promedio menor (${fmtM(Math.round(tA))} → ${fmtM(Math.round(tB))}): creció la transacción, se achicó la canasta.`,
    });
  }

  // 3. Cliente #1 del período B + movimiento de ranking.
  const top = clients.find((c) => c.rankB === 1);
  if (top && top.net.b > 0) {
    const move =
      top.rankA === null
        ? " (cliente nuevo)"
        : top.rankA !== 1
          ? ` (subió del puesto #${top.rankA} al #1)`
          : "";
    out.push({
      tone: "up",
      text: `${top.name} lidera el período con ${fmtM(top.net.b)} (${top.netShareB.toFixed(0)}% de la facturación)${move}.`,
    });
  }

  // 4. Mayor caída de cliente relevante (base >= 5% del neto A, caída >= 30%).
  const faller = clients
    .filter((c) => c.rankA !== null && c.net.a >= gA.net * 0.05 && c.net.pct !== null && c.net.pct <= -30)
    .sort((x, y) => (x.net.pct ?? 0) - (y.net.pct ?? 0))[0];
  if (faller) {
    const rankTxt = faller.rankB ? ` y pasó del puesto #${faller.rankA} al #${faller.rankB}` : ` (sin compras en el período actual)`;
    out.push({
      tone: "warn",
      text: `${faller.name} cayó ${fmtPct(faller.net.pct)}${rankTxt}; revisar reposición/contacto.`,
    });
  }

  // 5. Concentración: share del top 5 por neta.
  const top5B = clients.filter((c) => c.rankB !== null && c.rankB <= 5).reduce((s, c) => s + c.net.b, 0);
  const top5A = clients.filter((c) => c.rankA !== null && c.rankA <= 5).reduce((s, c) => s + c.net.a, 0);
  const concB = gB.net > 0 ? (top5B / gB.net) * 100 : 0;
  const concA = gA.net > 0 ? (top5A / gA.net) * 100 : 0;
  if (concB >= 35) {
    out.push({
      tone: "warn",
      text: `El top 5 de clientes concentra el ${concB.toFixed(0)}% de la facturación (${concA > 0 ? `${concA.toFixed(0)}% en el período anterior` : "sin base previa"}). La dependencia de pocos clientes sigue siendo un riesgo.`,
    });
  }

  // 6. Corte con mayor crecimiento / caída en kg (base mínima 3 kg).
  const corteGrow = [...cortes]
    .filter((c) => c.kgEq.a >= 3 && c.kgEq.pct !== null && c.kgEq.pct >= 15)
    .sort((x, y) => (y.kgEq.pct ?? 0) - (x.kgEq.pct ?? 0))[0];
  if (corteGrow) {
    out.push({
      tone: "up",
      text: `${corteGrow.corte} creció ${fmtPct(corteGrow.kgEq.pct)} en kg (${fmtKgN(corteGrow.kgEq.a)} → ${fmtKgN(corteGrow.kgEq.b)}).`,
    });
  }
  const corteFall = [...cortes]
    .filter((c) => c.kgEq.a >= 3 && c.kgEq.pct !== null && c.kgEq.pct <= -15)
    .sort((x, y) => (x.kgEq.pct ?? 0) - (y.kgEq.pct ?? 0))[0];
  if (corteFall) {
    out.push({
      tone: "down",
      text: `${corteFall.corte} cayó ${fmtPct(corteFall.kgEq.pct)} en kg (${fmtKgN(corteFall.kgEq.a)} → ${fmtKgN(corteFall.kgEq.b)}).`,
    });
  }

  // 7. Cambio de share mayorista/minorista (>= 2 pp en neta).
  const minorista = classMix.find((c) => c.class === "MINORISTA");
  if (minorista && Math.abs(minorista.netSharePp) >= 2) {
    out.push({
      tone: "neutral",
      text: `Minorista ${minorista.netSharePp > 0 ? "ganó" : "perdió"} ${Math.abs(minorista.netSharePp).toFixed(1).replace(".", ",")} pp de participación en la facturación (${minorista.netShareA.toFixed(0)}% → ${minorista.netShareB.toFixed(0)}%).`,
    });
  }

  // 8. Producto nuevo con ventas en B (sin ventas en A).
  const newProd = products
    .filter((p) => p.rankA === null && p.net.b > 0)
    .sort((x, y) => y.net.b - x.net.b)[0];
  if (newProd) {
    out.push({
      tone: "up",
      text: `${newProd.name} debutó en el período con ${fmtM(newProd.net.b)}.`,
    });
  }

  // 9. Clientes nuevos / perdidos.
  if (newClients.length > 0) {
    const names = newClients.slice(0, 3).map((c) => c.name).join(", ");
    out.push({
      tone: "up",
      text: `${newClients.length} cliente(s) nuevo(s) en el período${newClients.length <= 3 ? `: ${names}` : ` (top: ${names})`}.`,
    });
  }
  if (lostClients.length > 0) {
    const biggest = lostClients[0];
    out.push({
      tone: "warn",
      text: `${lostClients.length} cliente(s) sin compras en el período actual que sí compraron antes (el mayor: ${biggest.name}, ${fmtM(biggest.net.a)}).`,
    });
  }

  // 10. Funnel web: caída de conversión carrito → checkout (si hay datos en ambos).
  if (analytics.hasData) {
    const cart = analytics.funnel.find((f) => f.step === "add_to_cart");
    const checkout = analytics.funnel.find((f) => f.step === "begin_checkout");
    if (cart && checkout && cart.d.a > 0 && cart.d.b > 0) {
      const convA = (checkout.d.a / cart.d.a) * 100;
      const convB = (checkout.d.b / cart.d.b) * 100;
      if (convB < convA - 10) {
        out.push({
          tone: "warn",
          text: `El funnel web se debilitó entre carrito y checkout: ${convA.toFixed(0)}% → ${convB.toFixed(0)}% de conversión.`,
        });
      }
    }
  }

  // 11. Tasa de descuento (>= 1 pp de cambio).
  if (Math.abs(discounts.ratePp) >= 1) {
    out.push({
      tone: discounts.ratePp > 0 ? "down" : "neutral",
      text: `La tasa de descuento sobre la bruta ${discounts.ratePp > 0 ? "subió" : "bajó"} de ${discounts.rateA.toFixed(1).replace(".", ",")}% a ${discounts.rateB.toFixed(1).replace(".", ",")}%.`,
    });
  }

  return out.slice(0, 10);
}

// ---- Presets de períodos (fechas en hora argentina, yyyy-mm-dd) ----

function arToday(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function shiftDays(yyyymmdd: string, days: number): string {
  const d = new Date(`${yyyymmdd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Devuelve { periodA, periodB } para cada preset. B = período actual, A = base.
export function resolvePreset(preset: string): { periodA: PeriodRange; periodB: PeriodRange } {
  const today = arToday();
  const [y, m] = today.split("-").map(Number);

  if (preset === "7d") {
    const bFrom = shiftDays(today, -6);
    return {
      periodB: { from: bFrom, to: today },
      periodA: { from: shiftDays(bFrom, -7), to: shiftDays(bFrom, -1) },
    };
  }
  if (preset === "30d") {
    const bFrom = shiftDays(today, -29);
    return {
      periodB: { from: bFrom, to: today },
      periodA: { from: shiftDays(bFrom, -30), to: shiftDays(bFrom, -1) },
    };
  }
  if (preset === "mtd") {
    // Mes actual (a hoy) vs mismo tramo del mes anterior.
    const bFrom = `${today.slice(0, 7)}-01`;
    const dayOfMonth = Number(today.slice(8, 10));
    const prevFirst = new Date(y, m - 2, 1);
    const prevLastDay = new Date(y, m - 1, 0).getDate();
    const aTo = `${prevFirst.getFullYear()}-${pad2(prevFirst.getMonth() + 1)}-${pad2(Math.min(dayOfMonth, prevLastDay))}`;
    const aFrom = `${prevFirst.getFullYear()}-${pad2(prevFirst.getMonth() + 1)}-01`;
    return { periodB: { from: bFrom, to: today }, periodA: { from: aFrom, to: aTo } };
  }
  // default: "month" — este mes (a hoy) vs mes anterior COMPLETO.
  const bFrom = `${today.slice(0, 7)}-01`;
  const prevFirst = new Date(y, m - 2, 1);
  const prevLast = new Date(y, m - 1, 0);
  return {
    periodB: { from: bFrom, to: today },
    periodA: {
      from: `${prevFirst.getFullYear()}-${pad2(prevFirst.getMonth() + 1)}-01`,
      to: `${prevLast.getFullYear()}-${pad2(prevLast.getMonth() + 1)}-${pad2(prevLast.getDate())}`,
    },
  };
}
