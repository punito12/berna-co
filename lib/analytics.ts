// Analytics interno del ecommerce (embudo). Registra eventos anónimos en
// AnalyticsEvent y construye el reporte del dashboard admin. NUNCA guarda datos
// personales (nombre/teléfono/email/dirección exacta). El registro es
// best-effort: si algo falla, se loguea y se sigue — jamás bloquea checkout.

import { prisma } from "@/lib/db";

// Eventos válidos del funnel. Cualquier otro nombre se descarta en el ingest.
export const ANALYTICS_EVENTS = [
  "page_view",
  "product_view",
  "variant_selected",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "begin_checkout",
  "checkout_step_view",
  "payment_method_selected",
  "delivery_method_selected",
  "delivery_locality_selected",
  "checkout_error",
  // Significa "pedido creado" en el sistema, no necesariamente pagado.
  // La aprobación de Mercado Pago / cobro manual es otro estado operativo.
  "order_created",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isValidEventName(name: unknown): name is AnalyticsEventName {
  return (
    typeof name === "string" &&
    (ANALYTICS_EVENTS as readonly string[]).includes(name)
  );
}

// Recorta strings para no guardar payloads gigantes ni datos accidentales.
function clip(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function clipInt(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

// Solo guardamos el pathname (sin querystring) para no filtrar tokens/PII que a
// veces viajan en la URL. La campaña (UTM) se captura aparte, ya parseada.
function safePath(v: unknown): string | null {
  const s = clip(v, 512);
  if (!s) return null;
  const q = s.indexOf("?");
  return q >= 0 ? s.slice(0, q) : s;
}

export type TrackInput = {
  eventName: string;
  sessionId: string;
  anonymousId: string;
  path?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  productId?: string | null;
  productName?: string | null;
  variantName?: string | null;
  quantity?: number | null;
  value?: number | null;
  paymentMethod?: string | null;
  deliveryMethod?: string | null;
  locality?: string | null;
  orderId?: string | null;
  metadata?: unknown;
};

const SENSITIVE_METADATA_KEYS = [
  "address",
  "direccion",
  "cliente",
  "customer",
  "dni",
  "email",
  "mail",
  "name",
  "nombre",
  "password",
  "phone",
  "telefono",
  "token",
  "whatsapp",
] as const;

let lastRecordErrorLogAt = 0;

function shouldLogRecordError(): boolean {
  const now = Date.now();
  if (now - lastRecordErrorLogAt < 60_000) return false;
  lastRecordErrorLogAt = now;
  return true;
}

function cleanString(v: unknown, max = 300): string | null {
  const s = clip(v, max);
  if (!s) return null;
  // Control chars fuera; evita payloads raros en reportes/logs.
  return s.replace(/[\u0000-\u001f\u007f]/g, "");
}

function cleanInt(v: unknown, min = 0, max = 10_000_000): number | null {
  const n = clipInt(v);
  if (n === null) return null;
  if (n < min || n > max) return null;
  return n;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isSensitiveMetadataKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_METADATA_KEYS.some((sensitive) => k.includes(sensitive));
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 2) return null;
  if (typeof value === "string") return cleanString(value, 160);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadataValue(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 30)) {
      if (isSensitiveMetadataKey(key)) continue;
      out[key.slice(0, 60)] = sanitizeMetadataValue(item, depth + 1);
    }
    return out;
  }
  return null;
}

function sanitizeMetadata(value: unknown): unknown {
  if (value == null) return null;
  const sanitized = sanitizeMetadataValue(value);
  try {
    const encoded = JSON.stringify(sanitized);
    if (!encoded || encoded.length > 2000) return null;
    return sanitized;
  } catch {
    return null;
  }
}

export function sanitizeTrackInput(input: unknown): TrackInput | null {
  if (!isPlainObject(input)) return null;
  if (!isValidEventName(input.eventName)) return null;
  const sessionId = cleanString(input.sessionId, 64);
  const anonymousId = cleanString(input.anonymousId, 64);
  if (!sessionId || !anonymousId) return null;

  return {
    eventName: input.eventName,
    sessionId,
    anonymousId,
    path: safePath(input.path),
    referrer: safePath(input.referrer),
    utmSource: cleanString(input.utmSource, 120),
    utmMedium: cleanString(input.utmMedium, 120),
    utmCampaign: cleanString(input.utmCampaign, 120),
    utmContent: cleanString(input.utmContent, 120),
    utmTerm: cleanString(input.utmTerm, 120),
    productId: cleanString(input.productId, 64),
    productName: cleanString(input.productName, 200),
    variantName: cleanString(input.variantName, 80),
    quantity: cleanInt(input.quantity, 0, 1000),
    value: cleanInt(input.value),
    paymentMethod: cleanString(input.paymentMethod, 40),
    deliveryMethod: cleanString(input.deliveryMethod, 40),
    locality: cleanString(input.locality, 120),
    orderId: cleanString(input.orderId, 64),
    metadata: sanitizeMetadata(input.metadata),
  };
}

// Registra un evento. Devuelve true si se guardó. Best-effort: nunca lanza.
//  - Valida el nombre del evento (descarta desconocidos).
//  - Dedupe de order_created por orderId (un pedido cuenta una sola vez aunque
//    el cliente recargue la página de confirmación).
export async function recordEvent(input: TrackInput): Promise<boolean> {
  try {
    const event = sanitizeTrackInput(input);
    if (!event) return false;

    // Dedupe de pedidos: si ya existe un order_created con ese orderId, no repetir.
    if (event.eventName === "order_created" && event.orderId) {
      const existing = await prisma.analyticsEvent.findFirst({
        where: { eventName: "order_created", orderId: event.orderId },
        select: { id: true },
      });
      if (existing) return true; // ya contado
    }

    let metadata: string | null = null;
    if (event.metadata != null) {
      try {
        metadata = JSON.stringify(event.metadata).slice(0, 2000);
      } catch {
        metadata = null;
      }
    }

    await prisma.analyticsEvent.create({
      data: {
        eventName: event.eventName,
        sessionId: event.sessionId,
        anonymousId: event.anonymousId,
        path: event.path,
        referrer: event.referrer,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        utmContent: event.utmContent,
        utmTerm: event.utmTerm,
        productId: event.productId,
        productName: event.productName,
        variantName: event.variantName,
        quantity: event.quantity,
        value: event.value,
        paymentMethod: event.paymentMethod,
        deliveryMethod: event.deliveryMethod,
        locality: event.locality,
        orderId: event.orderId,
        metadata,
      },
    });
    return true;
  } catch (e) {
    if (shouldLogRecordError()) {
      console.error("recordEvent failed:", e);
    }
    return false;
  }
}

// ---- Reporte del dashboard admin -------------------------------------------

export type AnalyticsReport = {
  hasData: boolean;
  kpis: {
    sessions: number; // sesiones únicas (sessionId distintos)
    visitors: number; // visitantes únicos (anonymousId distintos)
    pageViews: number;
    productViews: number;
    addToCart: number;
    beginCheckout: number;
    orders: number;
    revenue: number; // pesos, suma de value de order_created
    avgOrderValue: number;
    conversionRate: number; // orders / sessions (%)
  };
  funnel: { step: string; label: string; count: number; pctOfTop: number }[];
  products: {
    productId: string;
    name: string;
    views: number;
    addToCart: number;
    orders: number; // unidades pedidas (de items en order_created metadata) — ver nota
    viewToCart: number; // %
    cartToOrderHint: number; // % add_to_cart que terminaron en compra (aprox por producto)
  }[];
  campaigns: {
    campaign: string;
    source: string;
    sessions: number;
    orders: number;
    revenue: number;
    conversion: number; // %
  }[];
  localities: { locality: string; beginCheckout: number; orders: number }[];
  payments: { method: string; selected: number; orders: number }[];
};

type RawEvent = {
  eventName: string;
  sessionId: string;
  anonymousId: string;
  productId: string | null;
  productName: string | null;
  value: number | null;
  paymentMethod: string | null;
  deliveryMethod: string | null;
  locality: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  orderId: string | null;
};

function safeDiv(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
}

// Construye el reporte sobre [from, to). Una sola query + agregación en memoria
// (el volumen de un comercio chico lo permite y mantiene el código claro).
export async function buildAnalyticsReport(
  from: Date,
  to: Date
): Promise<AnalyticsReport> {
  const events = (await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: {
      eventName: true,
      sessionId: true,
      anonymousId: true,
      productId: true,
      productName: true,
      value: true,
      paymentMethod: true,
      deliveryMethod: true,
      locality: true,
      utmSource: true,
      utmCampaign: true,
      orderId: true,
    },
  })) as RawEvent[];

  const sessions = new Set<string>();
  const visitors = new Set<string>();
  let pageViews = 0;
  let productViews = 0;
  let addToCart = 0;
  let beginCheckout = 0;
  let revenue = 0;
  const orderIds = new Set<string>(); // dedupe defensivo de pedidos

  // por producto
  const prod = new Map<
    string,
    { name: string; views: number; addToCart: number; orders: number }
  >();
  // por campaña
  const camp = new Map<
    string,
    { source: string; sessions: Set<string>; orders: number; revenue: number }
  >();
  // por localidad
  const loc = new Map<string, { beginCheckout: number; orders: number }>();
  // por medio de pago
  const pay = new Map<string, { selected: number; orders: number }>();

  function prodRow(id: string, name: string | null) {
    let r = prod.get(id);
    if (!r) {
      r = { name: name || "Producto", views: 0, addToCart: 0, orders: 0 };
      prod.set(id, r);
    } else if (name && r.name === "Producto") r.name = name;
    return r;
  }

  for (const e of events) {
    sessions.add(e.sessionId);
    visitors.add(e.anonymousId);
    switch (e.eventName) {
      case "page_view":
        pageViews += 1;
        break;
      case "product_view":
        productViews += 1;
        if (e.productId) prodRow(e.productId, e.productName).views += 1;
        break;
      case "add_to_cart":
        addToCart += 1;
        if (e.productId) prodRow(e.productId, e.productName).addToCart += 1;
        break;
      case "begin_checkout":
        beginCheckout += 1;
        break;
      case "payment_method_selected": {
        const m = e.paymentMethod || "—";
        const r = pay.get(m) ?? { selected: 0, orders: 0 };
        r.selected += 1;
        pay.set(m, r);
        break;
      }
      case "delivery_locality_selected": {
        const l = e.locality || "—";
        const r = loc.get(l) ?? { beginCheckout: 0, orders: 0 };
        r.beginCheckout += 1;
        loc.set(l, r);
        break;
      }
      case "order_created": {
        if (e.orderId && orderIds.has(e.orderId)) break; // dedupe
        if (e.orderId) orderIds.add(e.orderId);
        revenue += e.value ?? 0;
        // pago
        if (e.paymentMethod) {
          const r = pay.get(e.paymentMethod) ?? { selected: 0, orders: 0 };
          r.orders += 1;
          pay.set(e.paymentMethod, r);
        }
        // localidad
        if (e.locality) {
          const r = loc.get(e.locality) ?? { beginCheckout: 0, orders: 0 };
          r.orders += 1;
          loc.set(e.locality, r);
        }
        // campaña
        if (e.utmCampaign || e.utmSource) {
          const key = e.utmCampaign || e.utmSource || "—";
          const r =
            camp.get(key) ??
            { source: e.utmSource || "—", sessions: new Set<string>(), orders: 0, revenue: 0 };
          r.orders += 1;
          r.revenue += e.value ?? 0;
          camp.set(key, r);
        }
        break;
      }
    }
    // sesiones por campaña (cualquier evento con utm cuenta la sesión)
    if (e.utmCampaign || e.utmSource) {
      const key = e.utmCampaign || e.utmSource || "—";
      const r =
        camp.get(key) ??
        { source: e.utmSource || "—", sessions: new Set<string>(), orders: 0, revenue: 0 };
      r.sessions.add(e.sessionId);
      camp.set(key, r);
    }
  }

  const orders = orderIds.size;
  const sessionCount = sessions.size;

  const funnelTop = productViews || pageViews || 1;
  const funnel = [
    { step: "product_view", label: "Vieron producto", count: productViews },
    { step: "add_to_cart", label: "Agregaron al carrito", count: addToCart },
    { step: "begin_checkout", label: "Iniciaron checkout", count: beginCheckout },
    { step: "order_created", label: "Crearon pedido", count: orders },
  ].map((s) => ({ ...s, pctOfTop: safeDiv(s.count, funnelTop) }));

  const products = [...prod.entries()]
    .map(([productId, r]) => ({
      productId,
      name: r.name,
      views: r.views,
      addToCart: r.addToCart,
      orders: r.orders,
      viewToCart: safeDiv(r.addToCart, r.views),
      cartToOrderHint: safeDiv(r.orders, r.addToCart),
    }))
    .sort((a, b) => b.views - a.views);

  const campaigns = [...camp.entries()]
    .map(([campaign, r]) => ({
      campaign,
      source: r.source,
      sessions: r.sessions.size,
      orders: r.orders,
      revenue: r.revenue,
      conversion: safeDiv(r.orders, r.sessions.size),
    }))
    .sort((a, b) => b.orders - a.orders || b.sessions - a.sessions);

  const localities = [...loc.entries()]
    .map(([locality, r]) => ({ locality, beginCheckout: r.beginCheckout, orders: r.orders }))
    .sort((a, b) => b.orders - a.orders || b.beginCheckout - a.beginCheckout);

  const payments = [...pay.entries()]
    .map(([method, r]) => ({ method, selected: r.selected, orders: r.orders }))
    .sort((a, b) => b.orders - a.orders);

  return {
    hasData: events.length > 0,
    kpis: {
      sessions: sessionCount,
      visitors: visitors.size,
      pageViews,
      productViews,
      addToCart,
      beginCheckout,
      orders,
      revenue,
      avgOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
      conversionRate: safeDiv(orders, sessionCount),
    },
    funnel,
    products,
    campaigns,
    localities,
    payments,
  };
}
