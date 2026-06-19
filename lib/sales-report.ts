// Resumen de ventas por período (SOLO LECTURA). Agrega pedidos web (Order) y
// ventas manuales (ManualSale) en métricas de facturación, kilos/paquetes,
// productos, tipo de cliente, clientes y medios de pago. NO muta nada, NO crea
// eventos de negocio: solo lee y suma datos existentes.
//
// Semántica de los datos (fuente de verdad):
//  - Fecha efectiva: ManualSale.soldAt (la que elige el admin) / Order.createdAt.
//  - Facturación: se EXCLUYE el costo de envío de los pedidos web (es logística,
//    no producto). Las ventas manuales no tienen envío.
//  - Kg vs Paquetes: los productos de 1 kg (weightGrams === 1000) suman a "kg";
//    el resto (750 g, 500 g, etc.) suman a "paquetes". Los ítems de texto libre
//    de ventas manuales (sin producto vinculado) no tienen peso → no suman ni kg
//    ni paquetes, pero sí facturación (se reporta como limitación).
//  - Cancelados: se EXCLUYEN (no son facturación real).

import { prisma } from "@/lib/db";
import { SALE_PAYMENT_METHOD_LABELS } from "@/lib/management";
import { BREADCRUMB_LABELS } from "@/lib/products";

// Para los reportes, cada empanado/variedad cuenta como un producto distinto:
// "Pechuga Pastoril — Tradicional" y "… — Keto" son productos separados.
//
// Realidad de los datos: algunos ítems guardan el snapshot del nombre con el
// empanado entre paréntesis (ej. "Pechuga Pastoril (Tradicional)") y a veces el
// campo breadcrumbType viene null. Para no duplicar ni partir la misma variante:
//  1) separamos el sufijo "(Empanado)" del nombre,
//  2) si breadcrumbType viene vacío, deducimos el empanado de ese sufijo.

const BREADCRUMB_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(BREADCRUMB_LABELS).map(([code, label]) => [
    label.toLowerCase(),
    code,
  ])
);

// Separa "Producto (Empanado)" → { base, suffix }. Si no hay paréntesis al
// final, suffix queda null.
function splitNameSuffix(name: string): { base: string; suffix: string | null } {
  const m = name.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!m) return { base: name.trim(), suffix: null };
  return { base: m[1].trim(), suffix: m[2].trim() };
}

// Empanado efectivo del ítem: el breadcrumbType guardado, o el deducido del
// sufijo del nombre. Devuelve "" si no hay.
function resolveBreadcrumb(
  productName: string,
  breadcrumb: string | null
): string {
  const bc = (breadcrumb ?? "").trim();
  if (bc) return bc;
  const { suffix } = splitNameSuffix(productName);
  if (!suffix) return "";
  // El sufijo puede ser el código (KETO) o la etiqueta (Keto).
  if (BREADCRUMB_LABELS[suffix.toUpperCase()]) return suffix.toUpperCase();
  return BREADCRUMB_BY_LABEL[suffix.toLowerCase()] ?? "";
}

function variantLabel(productName: string, breadcrumb: string | null): string {
  const base = splitNameSuffix(productName).base;
  const bc = resolveBreadcrumb(productName, breadcrumb);
  if (!bc) return base;
  const label = BREADCRUMB_LABELS[bc] ?? bc;
  return `${base} — ${label}`;
}

// Clave de agrupación por producto + empanado. Usa el id del producto si existe
// (más estable); para ítems de texto libre cae al nombre base (sin el sufijo).
function variantKey(
  productId: string | null,
  productName: string,
  breadcrumb: string | null
): string {
  const base = productId ?? `free:${splitNameSuffix(productName).base}`;
  const bc = resolveBreadcrumb(productName, breadcrumb) || "NONE";
  return `${base}__${bc}`;
}

export type ReportFilters = {
  from: Date; // inclusive
  to: Date; // exclusive (ya viene como "día siguiente 00:00")
  customerType?: string; // MINORISTA | MAYORISTA | KIOSCO | "" (todos)
  origin?: string; // WEB | WHATSAPP | MAYORISTA | KIOSCO | MANUAL | REMITO | "" (todos)
  paymentStatus?: string; // PAID | PENDING | PARTIAL | "" (todos)
  productId?: string; // "" (todos)
};

// Clasificación de cliente para el reporte.
export type CustomerClass = "MAYORISTA" | "MINORISTA" | "SIN_CLASIFICAR";

function classifyCustomer(type: string | null | undefined): CustomerClass {
  if (type === "MAYORISTA") return "MAYORISTA";
  if (type === "MINORISTA" || type === "KIOSCO") return "MINORISTA";
  return "SIN_CLASIFICAR";
}

export const CUSTOMER_CLASS_LABELS: Record<CustomerClass, string> = {
  MAYORISTA: "Mayorista",
  MINORISTA: "Minorista",
  SIN_CLASIFICAR: "Sin clasificar",
};

// ---- Estructuras de salida ----

export type MoneyKgRow = {
  gross: number;
  discount: number;
  net: number;
  kg: number; // unidades de productos de 1 kg
  packs: number; // unidades de productos que NO son de 1 kg
};

export type ProductRow = MoneyKgRow & {
  productId: string;
  name: string;
};

export type ProductByCustomerRow = {
  productId: string;
  name: string;
  kgMayorista: number;
  kgMinorista: number;
  kgSinClasificar: number;
  packsMayorista: number;
  packsMinorista: number;
  packsSinClasificar: number;
  kgTotal: number;
  packsTotal: number;
};

export type CustomerRow = {
  customerId: string | null;
  name: string;
  type: CustomerClass;
  purchases: number;
  kg: number;
  packs: number;
  net: number;
  discount: number;
};

export type PaymentRow = {
  method: string;
  label: string;
  count: number;
  collected: number; // total de ventas con estado pagado
  pending: number; // total de ventas con estado pendiente/parcial
  sold: number; // total vendido (cobrado + pendiente)
};

export type SalesReport = {
  hasData: boolean;
  // 1. Resumen general
  general: {
    gross: number;
    discount: number;
    net: number;
    kg: number;
    packs: number;
    avgPricePerKg: number; // neta de productos de 1 kg / kg
    salesCount: number;
    avgTicket: number;
    freeTextItems: number; // ítems sin producto (sin kg/paq) — limitación
  };
  // 2 + 7. Por producto (total)
  byProduct: ProductRow[];
  // 3. Mayorista vs minorista
  byCustomerClass: { class: CustomerClass; label: string; row: MoneyKgRow }[];
  // 4. Producto por tipo de cliente
  productByCustomer: ProductByCustomerRow[];
  // 5 + 6. Facturación por tipo de cliente (mayorista / minorista) por producto
  byClassProduct: Record<CustomerClass, { summary: MoneyKgRow; products: ProductRow[] }>;
  // 9. Ranking de clientes
  customers: CustomerRow[];
  // 10. Medios de pago
  payments: PaymentRow[];
};

// ---- Helpers de agregación ----

function emptyMoneyKg(): MoneyKgRow {
  return { gross: 0, discount: 0, net: 0, kg: 0, packs: 0 };
}

function isOneKg(weightGrams: number | null | undefined): boolean {
  return weightGrams === 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Etiqueta de medio de pago para el reporte (reusa las del dominio de ventas; el
// "CASH" viejo de pedidos web se mapea a EFECTIVO; MERCADOPAGO → MERCADO_PAGO).
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ...SALE_PAYMENT_METHOD_LABELS,
  MERCADOPAGO: "Mercado Pago",
  CASH: "Efectivo",
  "": "Sin especificar",
};

function normalizePaymentMethod(method: string | null | undefined): string {
  const m = (method ?? "").toUpperCase();
  if (m === "CASH") return "EFECTIVO";
  if (m === "MERCADOPAGO") return "MERCADO_PAGO";
  if (
    m === "EFECTIVO" ||
    m === "TRANSFERENCIA" ||
    m === "MERCADO_PAGO" ||
    m === "OTRO"
  ) {
    return m;
  }
  return "OTRO";
}

// Una línea ya normalizada (de un pedido web o una venta manual), lista para
// agregar. `gross/discount/net` son a nivel ítem (prorrateados) para sumar por
// producto sin perder el total de la venta.
type NormalizedItem = {
  productId: string | null;
  productName: string;
  breadcrumbType: string | null; // empanado copiado en el ítem (snapshot)
  weightGrams: number | null;
  units: number;
  gross: number;
  discount: number;
  net: number;
};

type NormalizedSale = {
  id: string;
  kind: "ORDER" | "MANUAL" | "REMITO";
  date: Date;
  customerId: string | null;
  customerName: string;
  customerClass: CustomerClass;
  paymentMethod: string;
  paymentStatus: string; // PAID | PARTIAL | PENDING
  gross: number;
  discount: number;
  net: number;
  items: NormalizedItem[];
};

// ---- Carga + normalización ----

async function loadNormalizedSales(
  filters: ReportFilters
): Promise<NormalizedSale[]> {
  const dateRange = { gte: filters.from, lt: filters.to };
  const includeOrders = !filters.origin || filters.origin === "WEB";
  // Las ventas manuales entran cuando no hay filtro de origen o el origen es uno
  // de sus canales (WHATSAPP/MAYORISTA/KIOSCO) o "MANUAL" (todas). NO cuando el
  // origen pedido es WEB ni REMITO.
  const includeManual =
    !filters.origin ||
    (filters.origin !== "WEB" && filters.origin !== "REMITO");
  // Los remitos entran cuando no hay filtro de origen o el origen es "REMITO".
  // Se excluyen cuando: hay otro origen específico (para no mezclarlos); hay un
  // filtro por tipo de cliente (los remitos no guardan cliente vinculado); o hay
  // un filtro de estado de pago distinto de PAID (los remitos no tienen cuenta
  // corriente → se consideran cobrados).
  const includeRemitos =
    (!filters.origin || filters.origin === "REMITO") &&
    !filters.customerType &&
    (!filters.paymentStatus || filters.paymentStatus === "PAID");

  const customerTypeWhere = filters.customerType
    ? { customer: { type: filters.customerType } }
    : {};

  const [orders, sales, remitos] = await Promise.all([
    includeOrders
      ? prisma.order.findMany({
          where: {
            createdAt: dateRange,
            status: { not: "CANCELLED" },
            ...customerTypeWhere,
            ...(filters.paymentStatus
              ? { paymentStatus: filters.paymentStatus }
              : {}),
            ...(filters.productId
              ? { items: { some: { productId: filters.productId } } }
              : {}),
          },
          include: {
            items: {
              include: {
                product: { select: { name: true, weightGrams: true } },
              },
            },
            customer: { select: { type: true, name: true } },
          },
        })
      : Promise.resolve([]),
    includeManual
      ? prisma.manualSale.findMany({
          where: {
            soldAt: dateRange,
            deliveryStatus: { not: "CANCELLED" },
            ...(filters.origin && filters.origin !== "WEB"
              ? filters.origin === "MANUAL"
                ? {}
                : { channel: filters.origin }
              : {}),
            ...customerTypeWhere,
            ...(filters.paymentStatus
              ? { paymentStatus: filters.paymentStatus }
              : {}),
            ...(filters.productId
              ? { items: { some: { productId: filters.productId } } }
              : {}),
          },
          include: {
            items: {
              include: {
                product: { select: { name: true, weightGrams: true } },
              },
            },
            customer: { select: { type: true, name: true } },
          },
        })
      : Promise.resolve([]),
    includeRemitos
      ? prisma.remito.findMany({
          where: {
            date: dateRange,
            // Los remitos archivados NO cuentan como venta (se sacaron de circulación).
            archived: false,
          },
          include: { items: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve([]),
  ]);

  const out: NormalizedSale[] = [];

  // --- Pedidos web ---
  for (const o of orders) {
    // Bruto de productos = subtotal de ítems (priceAtTime * qty). Neto de
    // productos = total - envío. Descuento = lo que figure en discountAmount.
    const itemsGross = o.items.reduce(
      (a, it) => a + it.priceAtTime * it.quantity,
      0
    );
    const productNet = Math.max(0, o.total - (o.shippingCost ?? 0));
    const discount = o.discountAmount ?? 0;
    // Prorratear bruto/desc/neto por ítem según su peso en el bruto de ítems.
    const items: NormalizedItem[] = o.items.map((it) => {
      const lineGross = it.priceAtTime * it.quantity;
      const share = itemsGross > 0 ? lineGross / itemsGross : 0;
      return {
        productId: it.productId,
        // OrderItem no guarda snapshot del nombre → usa el del producto actual.
        productName: it.product?.name ?? "Producto",
        breadcrumbType: it.breadcrumbType ?? null,
        weightGrams: it.product?.weightGrams ?? null,
        units: it.quantity,
        gross: lineGross,
        discount: Math.round(discount * share),
        net: Math.round(productNet * share),
      };
    });
    out.push({
      id: o.id,
      kind: "ORDER",
      date: o.createdAt,
      customerId: o.customerId,
      customerName: o.customer?.name ?? o.customerName ?? "Cliente sin registrar",
      customerClass: classifyCustomer(o.customer?.type),
      paymentMethod: normalizePaymentMethod(o.paymentMethod),
      paymentStatus: o.paymentStatus ?? "PENDING",
      gross: itemsGross,
      discount,
      net: productNet,
      items,
    });
  }

  // --- Ventas manuales ---
  for (const s of sales) {
    const itemsGross = s.items.reduce((a, it) => a + it.lineSubtotal, 0);
    const items: NormalizedItem[] = s.items.map((it) => {
      const share = itemsGross > 0 ? it.lineSubtotal / itemsGross : 0;
      return {
        productId: it.productId,
        // SaleItem SÍ guarda snapshot del nombre → lo priorizamos (histórico
        // estable aunque cambie el producto después).
        productName: it.productName || it.product?.name || "Producto",
        breadcrumbType: it.breadcrumbType ?? null,
        weightGrams: it.product?.weightGrams ?? null,
        units: it.quantity,
        gross: it.lineSubtotal,
        discount: Math.round((s.discountAmount ?? 0) * share),
        net: Math.round((s.net ?? 0) * share),
      };
    });
    out.push({
      id: s.id,
      kind: "MANUAL",
      date: s.soldAt,
      customerId: s.customerId,
      customerName: s.customer?.name ?? s.customerName ?? "Cliente sin registrar",
      customerClass: classifyCustomer(s.customer?.type),
      paymentMethod: normalizePaymentMethod(s.paymentMethod),
      paymentStatus: s.paymentStatus ?? "PAID",
      gross: s.gross ?? itemsGross,
      discount: s.discountAmount ?? 0,
      net: s.net ?? 0,
      items,
    });
  }

  // --- Remitos ---
  // Cada remito cuenta como una venta de origen "Remito". Los ítems del remito
  // son de texto libre (no vinculan producto), pero llevan su propio nombre,
  // empanado embebido en el nombre ("Producto (Empanado)"), cantidad y unidad
  // (kg | paq.) → se agrupan por producto + empanado igual que el resto, usando
  // SIEMPRE el dato copiado en el remito (histórico estable). El remito NO toca
  // stock/caja/MP: acá solo se LEE para sumarlo al reporte.
  for (const r of remitos) {
    const itemsGross = r.items.reduce((a, it) => a + it.total, 0);
    const net = r.total ?? 0;
    const discount = r.discountAmount ?? 0;
    const items: NormalizedItem[] = r.items.map((it) => {
      const share = itemsGross > 0 ? it.total / itemsGross : 0;
      // La unidad del ítem decide kg vs paquete: "kg" → producto de 1 kg
      // (weightGrams 1000), "paq." → paquete (peso ≠ 1000). Así reusa la misma
      // clasificación kg/paq del resto del reporte sin tratarlos como texto libre.
      const weightGrams = it.unit === "paq." ? 500 : 1000;
      return {
        productId: null,
        productName: it.description || "Ítem",
        breadcrumbType: null, // se deduce del sufijo "(Empanado)" del nombre
        weightGrams,
        units: it.quantity,
        gross: it.total,
        discount: Math.round(discount * share),
        net: Math.round(net * share),
      };
    });
    out.push({
      id: r.id,
      kind: "REMITO",
      date: r.date,
      customerId: null, // los remitos no vinculan un Customer
      customerName: r.customerName?.trim() || "Cliente sin registrar",
      customerClass: classifyCustomer(null), // SIN_CLASIFICAR
      paymentMethod: normalizePaymentMethod(r.paymentMethod),
      paymentStatus: "PAID",
      gross: r.subtotal ?? itemsGross,
      discount,
      net,
      items,
    });
  }

  return out;
}

// ---- Reporte ----

export async function buildSalesReport(
  filters: ReportFilters
): Promise<SalesReport> {
  const sales = await loadNormalizedSales(filters);

  const general = {
    gross: 0,
    discount: 0,
    net: 0,
    kg: 0,
    packs: 0,
    avgPricePerKg: 0,
    salesCount: sales.length,
    avgTicket: 0,
    freeTextItems: 0,
  };

  const productMap = new Map<string, ProductRow>();
  const classMap = new Map<CustomerClass, MoneyKgRow>([
    ["MAYORISTA", emptyMoneyKg()],
    ["MINORISTA", emptyMoneyKg()],
    ["SIN_CLASIFICAR", emptyMoneyKg()],
  ]);
  const prodByCustMap = new Map<string, ProductByCustomerRow>();
  const classProdMap = new Map<CustomerClass, Map<string, ProductRow>>([
    ["MAYORISTA", new Map()],
    ["MINORISTA", new Map()],
    ["SIN_CLASIFICAR", new Map()],
  ]);
  const customerMap = new Map<string, CustomerRow>();
  const paymentMap = new Map<string, PaymentRow>();

  for (const sale of sales) {
    general.gross += sale.gross;
    general.discount += sale.discount;
    general.net += sale.net;

    const isPaid = sale.paymentStatus === "PAID";

    // --- medios de pago ---
    {
      const key = sale.paymentMethod || "";
      const row =
        paymentMap.get(key) ??
        {
          method: key,
          label: PAYMENT_METHOD_LABELS[key] ?? key,
          count: 0,
          collected: 0,
          pending: 0,
          sold: 0,
        };
      row.count += 1;
      row.sold += sale.net;
      if (isPaid) row.collected += sale.net;
      else row.pending += sale.net;
      paymentMap.set(key, row);
    }

    // --- ranking de clientes ---
    {
      const key = sale.customerId ?? `name:${sale.customerName}`;
      const row =
        customerMap.get(key) ??
        {
          customerId: sale.customerId,
          name: sale.customerName,
          type: sale.customerClass,
          purchases: 0,
          kg: 0,
          packs: 0,
          net: 0,
          discount: 0,
        };
      row.purchases += 1;
      row.net += sale.net;
      row.discount += sale.discount;
      customerMap.set(key, row);
    }

    const classRow = classMap.get(sale.customerClass)!;
    classRow.gross += sale.gross;
    classRow.discount += sale.discount;
    classRow.net += sale.net;

    // --- ítems: kg/paq + por producto ---
    for (const it of sale.items) {
      const oneKg = isOneKg(it.weightGrams);
      const hasWeight = it.weightGrams != null;
      const kg = oneKg ? it.units : 0;
      const packs = hasWeight && !oneKg ? it.units : 0;
      if (!hasWeight) general.freeTextItems += 1;

      general.kg += kg;
      general.packs += packs;

      classRow.kg += kg;
      classRow.packs += packs;

      // cliente
      const custKey = sale.customerId ?? `name:${sale.customerName}`;
      const cust = customerMap.get(custKey);
      if (cust) {
        cust.kg += kg;
        cust.packs += packs;
      }

      // Cada producto + empanado es una fila distinta en los reportes.
      const pid = variantKey(it.productId, it.productName, it.breadcrumbType);
      const vname = variantLabel(it.productName, it.breadcrumbType);

      // por producto (total)
      {
        const row =
          productMap.get(pid) ??
          { productId: pid, name: vname, ...emptyMoneyKg() };
        row.gross += it.gross;
        row.discount += it.discount;
        row.net += it.net;
        row.kg += kg;
        row.packs += packs;
        productMap.set(pid, row);
      }

      // producto por tipo de cliente
      {
        const row =
          prodByCustMap.get(pid) ??
          {
            productId: pid,
            name: vname,
            kgMayorista: 0,
            kgMinorista: 0,
            kgSinClasificar: 0,
            packsMayorista: 0,
            packsMinorista: 0,
            packsSinClasificar: 0,
            kgTotal: 0,
            packsTotal: 0,
          };
        if (sale.customerClass === "MAYORISTA") {
          row.kgMayorista += kg;
          row.packsMayorista += packs;
        } else if (sale.customerClass === "MINORISTA") {
          row.kgMinorista += kg;
          row.packsMinorista += packs;
        } else {
          row.kgSinClasificar += kg;
          row.packsSinClasificar += packs;
        }
        row.kgTotal += kg;
        row.packsTotal += packs;
        prodByCustMap.set(pid, row);
      }

      // por producto dentro de cada clase de cliente
      {
        const map = classProdMap.get(sale.customerClass)!;
        const row =
          map.get(pid) ??
          { productId: pid, name: vname, ...emptyMoneyKg() };
        row.gross += it.gross;
        row.discount += it.discount;
        row.net += it.net;
        row.kg += kg;
        row.packs += packs;
        map.set(pid, row);
      }
    }
  }

  // Métricas derivadas del general.
  general.avgPricePerKg = general.kg > 0 ? Math.round(general.net / general.kg) : 0;
  general.avgTicket =
    general.salesCount > 0 ? Math.round(general.net / general.salesCount) : 0;

  const byProduct = [...productMap.values()].sort((a, b) => b.net - a.net);

  const byCustomerClass = (["MAYORISTA", "MINORISTA", "SIN_CLASIFICAR"] as const)
    .map((c) => ({ class: c, label: CUSTOMER_CLASS_LABELS[c], row: classMap.get(c)! }))
    // Ocultar "Sin clasificar" si no tiene nada.
    .filter(
      (x) =>
        x.class !== "SIN_CLASIFICAR" ||
        x.row.net > 0 ||
        x.row.kg > 0 ||
        x.row.packs > 0
    );

  const productByCustomer = [...prodByCustMap.values()].sort(
    (a, b) => b.kgTotal + b.packsTotal - (a.kgTotal + a.packsTotal)
  );

  const byClassProduct = {
    MAYORISTA: {
      summary: classMap.get("MAYORISTA")!,
      products: [...classProdMap.get("MAYORISTA")!.values()].sort(
        (a, b) => b.net - a.net
      ),
    },
    MINORISTA: {
      summary: classMap.get("MINORISTA")!,
      products: [...classProdMap.get("MINORISTA")!.values()].sort(
        (a, b) => b.net - a.net
      ),
    },
    SIN_CLASIFICAR: {
      summary: classMap.get("SIN_CLASIFICAR")!,
      products: [...classProdMap.get("SIN_CLASIFICAR")!.values()].sort(
        (a, b) => b.net - a.net
      ),
    },
  };

  const customers = [...customerMap.values()].sort((a, b) => b.net - a.net);

  const payments = [...paymentMap.values()].sort((a, b) => b.sold - a.sold);

  // redondeos finales de kg/packs (por las dudas)
  general.kg = round2(general.kg);
  general.packs = round2(general.packs);

  return {
    hasData: sales.length > 0,
    general,
    byProduct,
    byCustomerClass,
    productByCustomer,
    byClassProduct,
    customers,
    payments,
  };
}

// Precio promedio por kg de una fila (neta / kg). 0 si no hay kg.
export function pricePerKg(row: { net: number; kg: number }): number {
  return row.kg > 0 ? Math.round(row.net / row.kg) : 0;
}

// ---- Fechas en hora de Argentina ----
// Argentina es UTC−3 todo el año (sin DST). Un "yyyy-mm-dd" elegido por el admin
// representa ese día calendario local; lo convertimos al instante UTC del inicio
// del día en Argentina sumando 3h. Así una venta del 14/6 (guardada al mediodía)
// cae dentro del [14/6 00:00 ART, 15/6 00:00 ART) y no se corre por UTC.
// Inicio del día (00:00 ART) de un "yyyy-mm-dd", como instante UTC. Medianoche
// en Argentina (UTC−3) = 03:00 UTC del mismo día calendario.
export function arDayStart(yyyymmdd: string): Date {
  return new Date(`${yyyymmdd}T03:00:00.000Z`);
}

// `to` exclusivo = inicio del día siguiente (00:00 ART del día siguiente).
export function arDayEndExclusive(yyyymmdd: string): Date {
  return new Date(arDayStart(yyyymmdd).getTime() + 24 * 60 * 60 * 1000);
}

// "Hoy" en Argentina como yyyy-mm-dd.
export function arToday(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// Primer día del mes actual (en Argentina) como yyyy-mm-dd.
export function arFirstOfMonth(): string {
  return `${arToday().slice(0, 7)}-01`;
}
