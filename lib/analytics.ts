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

// Registra un evento. Devuelve true si se guardó. Best-effort: nunca lanza.
//  - Valida el nombre del evento (descarta desconocidos).
//  - Dedupe de order_created por orderId (un pedido cuenta una sola vez aunque
//    el cliente recargue la página de confirmación).
export async function recordEvent(input: TrackInput): Promise<boolean> {
  try {
    if (!isValidEventName(input.eventName)) return false;
    const sessionId = clip(input.sessionId, 64);
    const anonymousId = clip(input.anonymousId, 64);
    if (!sessionId || !anonymousId) return false;

    // Dedupe de pedidos: si ya existe un order_created con ese orderId, no repetir.
    if (input.eventName === "order_created" && input.orderId) {
      const existing = await prisma.analyticsEvent.findFirst({
        where: { eventName: "order_created", orderId: clip(input.orderId, 64) },
        select: { id: true },
      });
      if (existing) return true; // ya contado
    }

    let metadata: string | null = null;
    if (input.metadata != null) {
      try {
        metadata = JSON.stringify(input.metadata).slice(0, 2000);
      } catch {
        metadata = null;
      }
    }

    await prisma.analyticsEvent.create({
      data: {
        eventName: input.eventName,
        sessionId,
        anonymousId,
        path: safePath(input.path),
        referrer: clip(input.referrer, 512),
        utmSource: clip(input.utmSource, 120),
        utmMedium: clip(input.utmMedium, 120),
        utmCampaign: clip(input.utmCampaign, 120),
        utmContent: clip(input.utmContent, 120),
        utmTerm: clip(input.utmTerm, 120),
        productId: clip(input.productId, 64),
        productName: clip(input.productName, 200),
        variantName: clip(input.variantName, 80),
        quantity: clipInt(input.quantity),
        value: clipInt(input.value),
        paymentMethod: clip(input.paymentMethod, 40),
        deliveryMethod: clip(input.deliveryMethod, 40),
        locality: clip(input.locality, 120),
        orderId: clip(input.orderId, 64),
        metadata,
      },
    });
    return true;
  } catch (e) {
    console.error("recordEvent failed:", e);
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
