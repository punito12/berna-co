// Planillas de costos (CostSheet) — a flat replica of the user's Excel. Each
// sheet stores only the input quantities/prices; all totals are computed here
// with the exact formulas. No averaging, no auto-update of Product.costs.

import { prisma } from "@/lib/db";
import { BREADCRUMB_LABELS } from "@/lib/products";

// The editable input fields of a sheet (everything else is computed).
export type CostSheetInput = {
  productId: string;
  breadcrumbType: string;
  fecha?: string; // yyyy-mm-dd
  notas?: string;

  compraKg: number;
  compraPrecioUnit: number;
  limpioKg: number;

  huevosCantidad: number;
  huevosPrecioUnit: number;
  integralKg: number;
  integralPrecioUnit: number;
  tradicionalKg: number;
  tradicionalPrecioUnit: number;
  marinadaCantidad: number;
  marinadaPrecioUnit: number;

  prodFinalKg: number;
  bolsaCantidad: number;
  bolsaPrecioUnit: number;
  etiquetaCantidad: number;
  etiquetaPrecioUnit: number;

  sueldoPercent: number;
  utilidadesPercent: number;
};

// The computed totals for a sheet. Money kept as floats (the Excel shows
// decimals); round only for display.
export type CostSheetComputed = {
  compraTotal: number;
  limpioTotal: number;
  desperdicioKg: number;
  desperdicioTotal: number;
  huevosTotal: number;
  integralTotal: number;
  tradicionalTotal: number;
  marinadaTotal: number;
  subtotal: number;
  costo1xKg: number;
  bolsaTotal: number;
  etiquetaTotal: number;
  costo2xKg: number;
  sueldoMonto: number;
  utilidadesMonto: number;
  precioFinal: number;
};

type SheetNumbers = Omit<CostSheetInput, "productId" | "breadcrumbType" | "fecha" | "notas">;

// The exact Excel formulas.
export function computeCostSheet(s: SheetNumbers): CostSheetComputed {
  const compraTotal = s.compraKg * s.compraPrecioUnit;
  const limpioTotal = s.limpioKg * s.compraPrecioUnit;
  const desperdicioKg = s.compraKg - s.limpioKg;
  const desperdicioTotal = desperdicioKg * s.compraPrecioUnit;

  const huevosTotal = s.huevosCantidad * s.huevosPrecioUnit;
  const integralTotal = s.integralKg * s.integralPrecioUnit;
  const tradicionalTotal = s.tradicionalKg * s.tradicionalPrecioUnit;
  const marinadaTotal = s.marinadaCantidad * s.marinadaPrecioUnit;

  const subtotal =
    compraTotal +
    huevosTotal +
    integralTotal +
    tradicionalTotal +
    marinadaTotal;

  const costo1xKg = s.prodFinalKg > 0 ? subtotal / s.prodFinalKg : 0;

  const bolsaTotal = s.bolsaCantidad * s.bolsaPrecioUnit;
  const etiquetaTotal = s.etiquetaCantidad * s.etiquetaPrecioUnit;

  // Per the Excel: the bag + label totals are added directly (NOT divided by
  // prodFinalKg). The example gives 7758.87 + (110 + 300) = 8168.87.
  const costo2xKg = costo1xKg + bolsaTotal + etiquetaTotal;

  const sueldoMonto = costo2xKg * (s.sueldoPercent / 100);
  const utilidadesMonto = costo2xKg * (s.utilidadesPercent / 100);
  const precioFinal = costo2xKg + sueldoMonto + utilidadesMonto;

  return {
    compraTotal,
    limpioTotal,
    desperdicioKg,
    desperdicioTotal,
    huevosTotal,
    integralTotal,
    tradicionalTotal,
    marinadaTotal,
    subtotal,
    costo1xKg,
    bolsaTotal,
    etiquetaTotal,
    costo2xKg,
    sueldoMonto,
    utilidadesMonto,
    precioFinal,
  };
}

// ---- validation / normalization --------------------------------------------

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function int(v: unknown): number {
  return Math.round(num(v));
}

function cleanInput(input: CostSheetInput) {
  if (!input.productId || !input.breadcrumbType)
    throw new Error("Elegí un producto y un empanado.");
  const fecha =
    input.fecha && /^\d{4}-\d{2}-\d{2}$/.test(input.fecha)
      ? new Date(`${input.fecha}T12:00:00`)
      : new Date();
  return {
    productId: input.productId,
    breadcrumbType: input.breadcrumbType,
    fecha,
    notas: input.notas?.trim() || null,
    compraKg: Math.max(0, num(input.compraKg)),
    compraPrecioUnit: Math.max(0, int(input.compraPrecioUnit)),
    limpioKg: Math.max(0, num(input.limpioKg)),
    huevosCantidad: Math.max(0, int(input.huevosCantidad)),
    huevosPrecioUnit: Math.max(0, int(input.huevosPrecioUnit)),
    integralKg: Math.max(0, num(input.integralKg)),
    integralPrecioUnit: Math.max(0, int(input.integralPrecioUnit)),
    tradicionalKg: Math.max(0, num(input.tradicionalKg)),
    tradicionalPrecioUnit: Math.max(0, int(input.tradicionalPrecioUnit)),
    marinadaCantidad: Math.max(0, num(input.marinadaCantidad)),
    marinadaPrecioUnit: Math.max(0, int(input.marinadaPrecioUnit)),
    prodFinalKg: Math.max(0, num(input.prodFinalKg)),
    bolsaCantidad: Math.max(0, int(input.bolsaCantidad)),
    bolsaPrecioUnit: Math.max(0, int(input.bolsaPrecioUnit)),
    etiquetaCantidad: Math.max(0, int(input.etiquetaCantidad)),
    etiquetaPrecioUnit: Math.max(0, int(input.etiquetaPrecioUnit)),
    sueldoPercent: Math.max(0, int(input.sueldoPercent)),
    utilidadesPercent: Math.max(0, int(input.utilidadesPercent)),
  };
}

// ---- CRUD -------------------------------------------------------------------

export async function createCostSheet(input: CostSheetInput) {
  return prisma.costSheet.create({ data: cleanInput(input) });
}

export async function updateCostSheet(id: string, input: CostSheetInput) {
  const data = cleanInput(input);
  // productId / breadcrumbType aren't changed on update.
  const { productId: _p, breadcrumbType: _b, ...rest } = data;
  void _p;
  void _b;
  return prisma.costSheet.update({ where: { id }, data: rest });
}

// Duplicate: a new sheet with the same values and today's date.
export async function duplicateCostSheet(id: string) {
  const s = await prisma.costSheet.findUnique({ where: { id } });
  if (!s) throw new Error("Planilla no encontrada.");
  const { id: _id, createdAt: _c, updatedAt: _u, fecha: _f, ...rest } = s;
  void _id;
  void _c;
  void _u;
  void _f;
  return prisma.costSheet.create({ data: { ...rest, fecha: new Date() } });
}

export async function deleteCostSheet(id: string) {
  await prisma.costSheet.delete({ where: { id } });
}

// ---- reads ------------------------------------------------------------------

export type CostSheetRow = Omit<CostSheetInput, "fecha" | "notas"> & {
  id: string;
  fecha: Date;
  notas: string;
  computed: CostSheetComputed;
};

function toRow(s: {
  id: string;
  productId: string;
  breadcrumbType: string;
  fecha: Date;
  notas: string | null;
} & SheetNumbers): CostSheetRow {
  return {
    id: s.id,
    productId: s.productId,
    breadcrumbType: s.breadcrumbType,
    fecha: s.fecha,
    notas: s.notas ?? "",
    compraKg: s.compraKg,
    compraPrecioUnit: s.compraPrecioUnit,
    limpioKg: s.limpioKg,
    huevosCantidad: s.huevosCantidad,
    huevosPrecioUnit: s.huevosPrecioUnit,
    integralKg: s.integralKg,
    integralPrecioUnit: s.integralPrecioUnit,
    tradicionalKg: s.tradicionalKg,
    tradicionalPrecioUnit: s.tradicionalPrecioUnit,
    marinadaCantidad: s.marinadaCantidad,
    marinadaPrecioUnit: s.marinadaPrecioUnit,
    prodFinalKg: s.prodFinalKg,
    bolsaCantidad: s.bolsaCantidad,
    bolsaPrecioUnit: s.bolsaPrecioUnit,
    etiquetaCantidad: s.etiquetaCantidad,
    etiquetaPrecioUnit: s.etiquetaPrecioUnit,
    sueldoPercent: s.sueldoPercent,
    utilidadesPercent: s.utilidadesPercent,
    computed: computeCostSheet(s),
  };
}

// Sheets for one product+empanado, newest first.
export async function listCostSheets(
  productId: string,
  breadcrumbType: string
): Promise<CostSheetRow[]> {
  const sheets = await prisma.costSheet.findMany({
    where: { productId, breadcrumbType },
    orderBy: { fecha: "desc" },
  });
  return sheets.map(toRow);
}

// Products + their active empanados, for the selector.
export async function listProductBreadcrumbsForSheets() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => {
    let breadcrumbs: string[] = [];
    let disabled: string[] = [];
    try {
      const b = JSON.parse(p.availableBreadcrumbs);
      breadcrumbs = Array.isArray(b) ? b : [];
    } catch {}
    try {
      const d = JSON.parse(p.disabledBreadcrumbs);
      disabled = Array.isArray(d) ? d : [];
    } catch {}
    return {
      id: p.id,
      name: p.name,
      breadcrumbs: breadcrumbs
        .filter((b) => !disabled.includes(b))
        .map((b) => ({ code: b, label: BREADCRUMB_LABELS[b] ?? b })),
    };
  });
}
