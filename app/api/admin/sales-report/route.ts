import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  buildSalesReport,
  arDayStart,
  arDayEndExclusive,
  pricePerKg,
  CUSTOMER_CLASS_LABELS,
  type ReportFilters,
} from "@/lib/sales-report";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseFilters(searchParams: URLSearchParams): ReportFilters | null {
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return null;
  return {
    from: arDayStart(from),
    to: arDayEndExclusive(to),
    customerType: searchParams.get("customerType") || undefined,
    origin: searchParams.get("origin") || undefined,
    paymentStatus: searchParams.get("paymentStatus") || undefined,
    productId: searchParams.get("productId") || undefined,
  };
}

// CSV-safe: comillas dobles y separador.
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function reportToCsv(report: Awaited<ReturnType<typeof buildSalesReport>>): string {
  const lines: string[] = [];
  const push = (...cells: (string | number)[]) =>
    lines.push(cells.map(csvCell).join(";"));

  push("RESUMEN GENERAL");
  push("Facturación bruta", report.general.gross);
  push("Descuentos", report.general.discount);
  push("Facturación neta", report.general.net);
  push("Kg vendidos", report.general.kg);
  push("Paquetes vendidos", report.general.packs);
  push("Precio promedio por kg", report.general.avgPricePerKg);
  push("Cantidad de ventas", report.general.salesCount);
  push("Ticket promedio", report.general.avgTicket);
  push("");

  push("FACTURACIÓN POR PRODUCTO");
  push("Producto — Empanado", "Bruta", "Descuento", "Neta", "Kg", "Paq.", "Precio/kg");
  for (const p of report.byProduct) {
    push(p.name, p.gross, p.discount, p.net, p.kg, p.packs, pricePerKg(p));
  }
  push("");

  push("POR TIPO DE CLIENTE");
  push("Tipo", "Bruta", "Descuento", "Neta", "Kg", "Paq.", "Precio/kg");
  for (const c of report.byCustomerClass) {
    push(c.label, c.row.gross, c.row.discount, c.row.net, c.row.kg, c.row.packs, pricePerKg(c.row));
  }
  push("");

  push("RANKING DE CLIENTES");
  push("Cliente", "Tipo", "Compras", "Kg", "Paq.", "Neta", "Descuento", "Ticket prom.");
  for (const c of report.customers) {
    push(
      c.name,
      CUSTOMER_CLASS_LABELS[c.type],
      c.purchases,
      c.kg,
      c.packs,
      c.net,
      c.discount,
      c.purchases > 0 ? Math.round(c.net / c.purchases) : 0
    );
  }

  return lines.join("\n");
}

export async function GET(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const filters = parseFilters(searchParams);
  if (!filters) {
    return NextResponse.json(
      { error: "Rango de fechas inválido." },
      { status: 400 }
    );
  }
  try {
    const report = await buildSalesReport(filters);
    if (searchParams.get("format") === "csv") {
      const csv = "﻿" + reportToCsv(report); // BOM para Excel/acentos
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="resumen-ventas-${searchParams.get("from")}_${searchParams.get("to")}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("sales-report error:", error);
    return NextResponse.json(
      { error: "No se pudo generar el resumen." },
      { status: 500 }
    );
  }
}
