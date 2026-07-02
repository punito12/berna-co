// Observaciones automáticas del Resumen de ventas (UN período, la "fotografía").
// Motor de reglas puro sobre el SalesReport canónico: no toca la DB ni inventa
// datos. Es deliberadamente distinto al de Inteligencia Comercial (que compara
// dos períodos): acá las reglas describen composición, concentración y señales
// del período seleccionado.

import { pricePerKg, type SalesReport } from "@/lib/sales-report";

export type ResumenInsight = {
  tone: "up" | "down" | "warn" | "neutral";
  text: string;
};

function fmtM(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtKg(n: number): string {
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg`;
}
function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}

export function buildResumenInsights(report: SalesReport): ResumenInsight[] {
  const out: ResumenInsight[] = [];
  const g = report.general;
  if (!report.hasData || g.net <= 0) return out;

  // 1. Concentración de clientes (top 5 por neta).
  const top5 = report.customers.slice(0, 5);
  const top5Net = top5.reduce((s, c) => s + c.net, 0);
  const concentration = (top5Net / g.net) * 100;
  const top1 = report.customers[0];
  if (concentration >= 35 && report.customers.length > 5) {
    out.push({
      tone: "warn",
      text: `El top 5 de clientes concentra el ${fmtPct(concentration)} de la facturación. La dependencia de pocos clientes es el principal riesgo comercial del período.`,
    });
  } else if (top1 && top1.net / g.net >= 0.15) {
    out.push({
      tone: "neutral",
      text: `${top1.name} fue el cliente más importante: ${fmtM(top1.net)} (${fmtPct((top1.net / g.net) * 100)} de la facturación, ${top1.purchases} compra${top1.purchases === 1 ? "" : "s"}).`,
    });
  }

  // 2. Brecha de precio/kg minorista vs mayorista (la palanca de precio).
  const may = report.byCustomerClass.find((c) => c.class === "MAYORISTA")?.row;
  const min = report.byCustomerClass.find((c) => c.class === "MINORISTA")?.row;
  if (may && min && may.kgEq > 0 && min.kgEq > 0) {
    const pMay = pricePerKg(may);
    const pMin = pricePerKg(min);
    if (pMay > 0 && pMin > pMay * 1.08) {
      const gap = ((pMin - pMay) / pMay) * 100;
      out.push({
        tone: "up",
        text: `El precio/kg minorista (${fmtM(pMin)}) supera al mayorista (${fmtM(pMay)}) en ${fmtPct(gap)}: cada kg derivado al canal minorista deja más ingreso.`,
      });
    } else if (pMin > 0 && pMay > pMin * 1.08) {
      const gap = ((pMay - pMin) / pMin) * 100;
      out.push({
        tone: "neutral",
        text: `El precio/kg mayorista (${fmtM(pMay)}) superó al minorista (${fmtM(pMin)}) en ${fmtPct(gap)} en este período.`,
      });
    }
  }

  // 3. Corte dominante en kilos.
  const topCorte = [...report.corteKg].sort((a, b) => b.kgEq - a.kgEq)[0];
  if (topCorte && g.kgEq > 0 && topCorte.kgEq / g.kgEq >= 0.25) {
    out.push({
      tone: "neutral",
      text: `${topCorte.corte} concentró el ${fmtPct((topCorte.kgEq / g.kgEq) * 100)} de los kilos del período (${fmtKg(topCorte.kgEq)}, ${fmtM(topCorte.net)} de neta).`,
    });
  }

  // 4. Producto líder en facturación.
  const topProd = report.byProduct[0];
  if (topProd && topProd.net / g.net >= 0.2) {
    out.push({
      tone: "neutral",
      text: `${topProd.name} lideró la facturación con ${fmtM(topProd.net)} (${fmtPct((topProd.net / g.net) * 100)} del total).`,
    });
  }

  // 5. Origen dominante de las ventas.
  const topOrigin = [...report.byOrigin].sort((a, b) => b.net - a.net)[0];
  if (topOrigin && topOrigin.net / g.net >= 0.5) {
    out.push({
      tone: "neutral",
      text: `${topOrigin.label} explicaron el ${fmtPct((topOrigin.net / g.net) * 100)} de la facturación (${topOrigin.count} venta${topOrigin.count === 1 ? "" : "s"}).`,
    });
  }

  // 6. Cobro pendiente (cuenta corriente).
  const pendingTotal = report.payments.reduce((s, p) => s + p.pending, 0);
  if (pendingTotal / g.net >= 0.2) {
    out.push({
      tone: "warn",
      text: `El ${fmtPct((pendingTotal / g.net) * 100)} de lo vendido sigue pendiente de cobro (${fmtM(pendingTotal)}). Revisar cuenta corriente.`,
    });
  }

  // 7. Peso de los descuentos sobre la bruta.
  if (g.gross > 0 && g.discount / g.gross >= 0.12) {
    out.push({
      tone: "down",
      text: `Los descuentos se llevaron el ${fmtPct((g.discount / g.gross) * 100)} de la facturación bruta (${fmtM(g.discount)}): promos, +5 unidades, códigos y método de pago.`,
    });
  }

  // 8. Ítems de texto libre (limitación de datos, no de negocio).
  if (g.freeTextItems > 0) {
    out.push({
      tone: "neutral",
      text: `${g.freeTextItems} ítem(s) de texto libre cuentan en facturación pero no suman kg ni corte. Vincularlos a productos mejora el reporte.`,
    });
  }

  return out.slice(0, 8);
}
