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

// Separa el nombre de un ítem en { base, suffix } donde suffix es el empanado.
// Soporta las DOS formas en que se guarda el empanado en los datos:
//   1) entre paréntesis al final  → "Peceto (Tradicional)"        (ventas/pedidos)
//   2) tras un guion al final      → "Peceto — Tradicional" / "Peceto - Tradicional"
//      (descripciones de remito; admite em-dash —, en-dash – o guion -)
// Si no hay ninguno, suffix queda null.
function splitNameSuffix(name: string): { base: string; suffix: string | null } {
  const paren = name.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (paren) return { base: paren[1].trim(), suffix: paren[2].trim() };
  // Guion final: solo lo tratamos como empanado si lo que sigue es un empanado
  // conocido (evita partir nombres que legítimamente llevan guion).
  const dash = name.match(/^(.*?)\s*[—–-]\s*([^—–-]+)\s*$/);
  if (dash) {
    const candidate = dash[2].trim();
    if (
      BREADCRUMB_LABELS[candidate.toUpperCase()] ||
      BREADCRUMB_BY_LABEL[candidate.toLowerCase()]
    ) {
      return { base: dash[1].trim(), suffix: candidate };
    }
  }
  return { base: name.trim(), suffix: null };
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

// Clave de agrupación por producto + empanado. SIEMPRE se arma del nombre base
// normalizado (minúsculas, sin acentos, espacios colapsados) + el empanado
// resuelto — NUNCA del productId. Motivo: el MISMO producto+empanado llega por
// distintas fuentes con identidad distinta — ventas/pedidos traen productId,
// los remitos no (texto libre) —; si la clave dependiera del productId, una
// venta de "Peceto — Tradicional" y un remito del mismo corte caían en filas
// separadas. Normalizar el nombre une "Peceto - Tradicional", "PECETO —
// tradicional", "Peceto  (Tradicional)", etc. en una sola fila.
function variantKey(
  _productId: string | null, // ignorado a propósito (ver comentario)
  productName: string,
  breadcrumb: string | null
): string {
  const base = normalize(splitNameSuffix(productName).base);
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

// Clasificación de cliente para el reporte. Regla de negocio: SOLO dos
// categorías, mayorista y minorista (sin "sin clasificar").
//  - Mayorista: la venta viene de un remito, O está explícitamente marcada como
//    mayorista (tipo de cliente MAYORISTA, o canal MAYORISTA en venta manual).
//  - Minorista: todo lo demás (web, manual sin marcar, KIOSCO, desconocido).
export type CustomerClass = "MAYORISTA" | "MINORISTA";

// `kind` decide el origen; remitos son siempre mayoristas. Para Order/ManualSale
// se mira el tipo de cliente y, en ventas manuales, el canal.
function classifySale(args: {
  kind: "ORDER" | "MANUAL" | "REMITO";
  customerType?: string | null;
  channel?: string | null;
}): CustomerClass {
  if (args.kind === "REMITO") return "MAYORISTA";
  if (args.customerType === "MAYORISTA") return "MAYORISTA";
  if (args.channel === "MAYORISTA") return "MAYORISTA";
  return "MINORISTA";
}

export const CUSTOMER_CLASS_LABELS: Record<CustomerClass, string> = {
  MAYORISTA: "Mayorista",
  MINORISTA: "Minorista",
};

// ---- Estructuras de salida ----

export type MoneyKgRow = {
  gross: number;
  discount: number;
  net: number;
  kg: number; // unidades de productos de 1 kg
  packs: number; // unidades de productos que NO son de 1 kg
  // Kg EQUIVALENTES: cada unidad pesada en kilos reales (500 g = 0,5 kg, 750 g =
  // 0,75 kg, 1 kg = 1 kg; ítems en kg suman su cantidad). Base de TODO precio/kg.
  kgEq: number;
};

export type ProductRow = MoneyKgRow & {
  productId: string;
  name: string;
};

export type ProductByCustomerRow = {
  productId: string;
  name: string;
  // Kg equivalentes por clase (incluye paquetes convertidos a kg).
  kgEqMayorista: number;
  kgEqMinorista: number;
  kgEqTotal: number;
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

// Una fila de la tabla "Kg vendidos por corte" (agrega por encima del nivel
// producto+empanado: junta todas las variedades del mismo corte).
export type CorteRow = {
  corte: string; // etiqueta fija (Peceto, Bife, Cerdo, Pollo, Berenjenas, Gírgolas)
  kgEq: number; // kg equivalentes vendidos del corte
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
    kgEq: number; // kg equivalentes totales (incluye paquetes convertidos)
    avgPricePerKg: number; // neta total / kg EQUIVALENTES
    salesCount: number;
    // Ticket promedio SOLO de ventas minoristas (neto minorista / cantidad de
    // ventas minoristas). No incluye mayoristas ni remitos. 0 = sin minoristas.
    avgTicketMinorista: number;
    minoristaSalesCount: number;
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
  // 11. Kg vendidos por corte (orden fijo). En kg equivalentes.
  corteKg: CorteRow[];
  // Ítems que no se pudieron convertir a kg (sin peso ni unidad kg conocidos).
  // Se reportan; no rompen el cálculo.
  productsNotConvertible: string[];
};

// ---- Helpers de agregación ----

function emptyMoneyKg(): MoneyKgRow {
  return { gross: 0, discount: 0, net: 0, kg: 0, packs: 0, kgEq: 0 };
}

function isOneKg(weightGrams: number | null | undefined): boolean {
  return weightGrams === 1000;
}

// ---- Kg equivalentes y cortes -------------------------------------------------

// Normaliza a minúsculas sin acentos para matchear nombres de forma robusta.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Cortes del negocio, en ORDEN FIJO para la tabla "Kg vendidos por corte".
export const CORTES = [
  "Peceto",
  "Bife",
  "Cerdo",
  "Pollo",
  "Berenjenas",
  "Gírgolas",
] as const;
export type Corte = (typeof CORTES)[number];

// Mapea el nombre de un producto/ítem (con o sin sufijo de empanado) a un corte.
// Usa substrings normalizados. "Long Chicken Fingers"/"LCF" caen en Pollo.
// Devuelve null si no se puede asignar (→ "Sin corte asignado").
export function corteForName(name: string): Corte | null {
  const n = normalize(name);
  // Pollo primero: "long chicken fingers"/"lcf"/"chicken"/"pollo".
  if (
    n.includes("pollo") ||
    n.includes("chicken") ||
    n.includes("long chicken fingers") ||
    /\blcf\b/.test(n) ||
    n.includes("pechuga")
  )
    return "Pollo";
  if (n.includes("peceto")) return "Peceto"; // incluye "peceto de pastura"
  if (n.includes("bife")) return "Bife"; // incluye "bife de chorizo"
  if (n.includes("cerdo")) return "Cerdo";
  if (n.includes("berenjena")) return "Berenjenas"; // berenjena/berenjenas
  if (n.includes("girgola")) return "Gírgolas"; // gírgola(s)/girgola(s) (sin acento)
  return null;
}

// Peso por unidad (en gramos) deducido del nombre cuando NO hay peso del producto
// vinculado (ítems de remito de texto libre con unidad "paq."). Basado en los
// productos reales del catálogo: Long Chicken Fingers = 750 g; Berenjena y
// Gírgolas = 500 g; el resto = 1000 g. Devuelve null si no se reconoce.
function weightFromName(name: string): number | null {
  const n = normalize(name);
  if (n.includes("long chicken fingers") || /\blcf\b/.test(n)) return 750;
  if (n.includes("berenjena") || n.includes("girgola")) return 500;
  const corte = corteForName(name);
  // Si reconocemos el corte (peceto/bife/cerdo/pollo) asumimos 1 kg, que es el
  // peso real de todos esos cortes en el catálogo.
  if (corte) return 1000;
  return null;
}

// Kg equivalentes de un ítem. Para ítems en kg (remito unidad "kg") la cantidad
// YA está en kilos. Para ítems por unidad, multiplica unidades × (peso/1000).
// Devuelve null si no hay forma de convertir (sin peso conocido) → no se cuenta
// en precio/kg y se reporta como no convertible.
function kgEquivalentFor(it: NormalizedItem): number | null {
  if (it.unitIsKg) return it.units; // la "unidad" ya son kilos
  const grams = it.weightGrams ?? weightFromName(it.productName);
  if (grams == null) return null;
  return round2((it.units * grams) / 1000);
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
  // true cuando la "unidad" del ítem ya está expresada en kilos (ítems de remito
  // con unidad "kg"): entonces `units` ES la cantidad de kg vendida.
  unitIsKg: boolean;
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
        unitIsKg: false,
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
      customerClass: classifySale({ kind: "ORDER", customerType: o.customer?.type }),
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
        unitIsKg: false,
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
      customerClass: classifySale({
        kind: "MANUAL",
        customerType: s.customer?.type,
        channel: s.channel,
      }),
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
      const name = it.description || "Ítem";
      // Unidad "kg": la cantidad YA está en kilos (unitIsKg) → cuenta como kg.
      // Unidad "paq.": es por unidad; el peso se deduce del nombre del producto
      // (Long Chicken Fingers = 750 g, Berenjena/Gírgolas = 500 g, resto 1 kg)
      // para poder convertir a kg equivalentes — NUNCA se cuenta como "paquete
      // sin peso". Si el nombre no se reconoce, weightFromName devuelve null y el
      // ítem se reporta como no convertible (no rompe nada).
      const unitIsKg = it.unit !== "paq.";
      const weightGrams = unitIsKg ? 1000 : weightFromName(name);
      return {
        productId: null,
        productName: name,
        breadcrumbType: null, // se deduce del sufijo "(Empanado)" del nombre
        weightGrams,
        units: it.quantity,
        unitIsKg,
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
      customerClass: classifySale({ kind: "REMITO" }), // siempre MAYORISTA
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
    kgEq: 0,
    avgPricePerKg: 0,
    salesCount: sales.length,
    avgTicketMinorista: 0,
    minoristaSalesCount: 0,
    freeTextItems: 0,
  };

  // Ticket promedio minorista: SOLO ventas minoristas.
  let minoristaNet = 0;

  const productMap = new Map<string, ProductRow>();
  const classMap = new Map<CustomerClass, MoneyKgRow>([
    ["MAYORISTA", emptyMoneyKg()],
    ["MINORISTA", emptyMoneyKg()],
  ]);
  const prodByCustMap = new Map<string, ProductByCustomerRow>();
  const classProdMap = new Map<CustomerClass, Map<string, ProductRow>>([
    ["MAYORISTA", new Map()],
    ["MINORISTA", new Map()],
  ]);
  const customerMap = new Map<string, CustomerRow>();
  const paymentMap = new Map<string, PaymentRow>();
  // Kg equivalentes por corte + ítems no convertibles a kg.
  const corteMap = new Map<Corte, number>(CORTES.map((c) => [c, 0]));
  const notConvertible = new Set<string>();

  for (const sale of sales) {
    general.gross += sale.gross;
    general.discount += sale.discount;
    general.net += sale.net;

    if (sale.customerClass === "MINORISTA") {
      minoristaNet += sale.net;
      general.minoristaSalesCount += 1;
    }

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

    // --- ítems: kg/paq + kg equivalentes + por producto + por corte ---
    for (const it of sale.items) {
      const oneKg = isOneKg(it.weightGrams);
      const hasWeight = it.weightGrams != null;
      // kg/paq son contadores de UNIDADES (para "% sobre total"); kgEq es el peso
      // real en kilos (para precio/kg y kg por corte). Un ítem de remito en kg
      // cuenta como kg (la unidad ya es kilo).
      const kg = oneKg || it.unitIsKg ? it.units : 0;
      const packs = hasWeight && !oneKg && !it.unitIsKg ? it.units : 0;

      // Kg equivalentes: convierte paquetes (500/750 g) y kg a kilos reales.
      const kgEqRaw = kgEquivalentFor(it);
      const kgEq = kgEqRaw ?? 0;
      if (kgEqRaw == null) {
        // Sin peso ni unidad kg conocidos → no se puede convertir. Se reporta y
        // queda fuera de precio/kg y kg por corte (pero su facturación SÍ suma).
        general.freeTextItems += 1;
        notConvertible.add(it.productName);
      }

      general.kg += kg;
      general.packs += packs;
      general.kgEq += kgEq;

      classRow.kg += kg;
      classRow.packs += packs;
      classRow.kgEq += kgEq;

      // cliente
      const custKey = sale.customerId ?? `name:${sale.customerName}`;
      const cust = customerMap.get(custKey);
      if (cust) {
        cust.kg += kg;
        cust.packs += packs;
      }

      // --- kg por corte (agrega por encima de producto+empanado) ---
      const corte = corteForName(it.productName);
      if (corte && kgEq > 0) {
        corteMap.set(corte, (corteMap.get(corte) ?? 0) + kgEq);
      } else if (kgEq > 0) {
        // Tiene kg pero no se pudo mapear a un corte conocido → reportar.
        notConvertible.add(it.productName);
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
        row.kgEq += kgEq;
        productMap.set(pid, row);
      }

      // producto por tipo de cliente (en kg equivalentes)
      {
        const row =
          prodByCustMap.get(pid) ??
          {
            productId: pid,
            name: vname,
            kgEqMayorista: 0,
            kgEqMinorista: 0,
            kgEqTotal: 0,
          };
        if (sale.customerClass === "MAYORISTA") row.kgEqMayorista += kgEq;
        else row.kgEqMinorista += kgEq;
        row.kgEqTotal += kgEq;
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
        row.kgEq += kgEq;
        map.set(pid, row);
      }
    }
  }

  // Métricas derivadas del general. Precio/kg SIEMPRE sobre kg equivalentes.
  general.avgPricePerKg =
    general.kgEq > 0 ? Math.round(general.net / general.kgEq) : 0;
  general.avgTicketMinorista =
    general.minoristaSalesCount > 0
      ? Math.round(minoristaNet / general.minoristaSalesCount)
      : 0;

  const byProduct = [...productMap.values()].sort((a, b) => b.net - a.net);

  const byCustomerClass = (["MAYORISTA", "MINORISTA"] as const).map((c) => ({
    class: c,
    label: CUSTOMER_CLASS_LABELS[c],
    row: classMap.get(c)!,
  }));

  const productByCustomer = [...prodByCustMap.values()].sort(
    (a, b) => b.kgEqTotal - a.kgEqTotal
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
  };

  const customers = [...customerMap.values()].sort((a, b) => b.net - a.net);

  const payments = [...paymentMap.values()].sort((a, b) => b.sold - a.sold);

  // Kg por corte en ORDEN FIJO (no por monto). Solo cortes con kg > 0... pero
  // mostramos todos para que el operador vea los 6 cortes aunque alguno sea 0.
  const corteKg: CorteRow[] = CORTES.map((c) => ({
    corte: c,
    kgEq: round2(corteMap.get(c) ?? 0),
  }));

  // redondeos finales de kg/packs/kgEq (por las dudas)
  general.kg = round2(general.kg);
  general.packs = round2(general.packs);
  general.kgEq = round2(general.kgEq);

  // Guarda de consistencia (solo dev): ninguna tabla agrupada por producto debe
  // tener etiquetas repetidas. Si las hay, el criterio de agrupación se rompió.
  if (process.env.NODE_ENV !== "production") {
    assertNoDuplicateLabels("byProduct", byProduct);
    assertNoDuplicateLabels("productByCustomer", productByCustomer);
    assertNoDuplicateLabels("mayorista", byClassProduct.MAYORISTA.products);
    assertNoDuplicateLabels("minorista", byClassProduct.MINORISTA.products);
  }

  return {
    hasData: sales.length > 0,
    general,
    byProduct,
    byCustomerClass,
    productByCustomer,
    byClassProduct,
    customers,
    payments,
    corteKg,
    productsNotConvertible: [...notConvertible].sort(),
  };
}

// Precio promedio por kg de una fila: SIEMPRE sobre kg EQUIVALENTES (paquetes de
// 500/750 g convertidos a kilos). 0 si no hay kg equivalentes.
export function pricePerKg(row: { net: number; kgEq: number }): number {
  return row.kgEq > 0 ? Math.round(row.net / row.kgEq) : 0;
}

// Guarda interna (dev): avisa por consola si una tabla agrupada por producto
// tiene etiquetas "Producto — Empanado" repetidas. No toca la UI; es una red de
// seguridad para detectar regresiones en el criterio de agrupación.
function assertNoDuplicateLabels(
  table: string,
  rows: { name: string }[]
): void {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.name)) dups.add(r.name);
    seen.add(r.name);
  }
  if (dups.size > 0) {
    console.warn(
      `[sales-report] filas duplicadas en "${table}": ${[...dups].join(", ")}`
    );
  }
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
