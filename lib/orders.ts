// Order creation. All validation and pricing happen here on the server.
// IMPORTANT: prices and the total are recalculated from the database — the
// browser only sends product ids, the chosen empanado, and quantities.

import { prisma } from "@/lib/db";
import { BREADCRUMB_LABELS } from "@/lib/products";
import {
  geocodeStructured,
  findZoneByPoint,
  formatAddress,
  shippingFor,
} from "@/lib/zones";
import {
  quantityPromoDiscount,
  validateDiscountCode,
  consumeDiscountCode,
} from "@/lib/discounts";

// Thrown for invalid input; the API route turns this into a 400 with the message.
export class OrderValidationError extends Error {}

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  deliveryType: string; // DELIVERY | PICKUP
  // Structured delivery address (DELIVERY). street includes the number; floor
  // (piso/depto) is for the delivery only and isn't used for geocoding.
  street?: string;
  locality?: string;
  postalCode?: string;
  floor?: string;
  scheduledDate: string; // ISO date string
  scheduledSlot: string;
  paymentMethod: string; // CASH | MERCADOPAGO
  discountCode?: string; // optional code typed at checkout
  items: { productId: string; breadcrumbType: string; quantity: number }[];
};

const DELIVERY_TYPES = ["DELIVERY", "PICKUP"];
const PAYMENT_METHODS = ["CASH", "MERCADOPAGO"];

export async function createOrder(
  input: CreateOrderInput
): Promise<{ id: string }> {
  // --- basic field validation ---
  const name = input.customerName?.trim();
  const phone = input.customerPhone?.trim();
  if (!name) throw new OrderValidationError("Falta el nombre.");
  if (!phone) throw new OrderValidationError("Falta el teléfono.");

  if (!DELIVERY_TYPES.includes(input.deliveryType)) {
    throw new OrderValidationError("Tipo de entrega inválido.");
  }
  // Structured address parts for delivery.
  const street = input.street?.trim();
  const locality = input.locality?.trim();
  if (input.deliveryType === "DELIVERY") {
    if (!street) throw new OrderValidationError("Falta la calle y número.");
    if (!locality) throw new OrderValidationError("Falta la localidad.");
  }
  // The full one-line address we store on the order.
  const address =
    input.deliveryType === "DELIVERY"
      ? formatAddress({
          street: street ?? "",
          locality: locality ?? "",
          postalCode: input.postalCode,
          floor: input.floor,
        })
      : undefined;

  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new OrderValidationError(
      "Por ahora solo aceptamos pago en efectivo al recibir."
    );
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderValidationError("El carrito está vacío.");
  }

  // --- date + slot validation ---
  const scheduledDate = new Date(input.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new OrderValidationError("Fecha de entrega inválida.");
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scheduledDate < today) {
    throw new OrderValidationError("La fecha de entrega ya pasó.");
  }

  // The chosen time slot must be an active one (same for all zones).
  const activeSlot = await prisma.deliverySlot.findFirst({
    where: { label: input.scheduledSlot, available: true },
  });
  if (!activeSlot) {
    throw new OrderValidationError("Ese horario no está disponible.");
  }

  // The chosen weekday must be enabled for the delivery zone of this address.
  // We re-derive the zone server-side (don't trust the client): geocode the
  // address → find the zone → check the zone delivers on that weekday.
  // deliveryCoords is filled for DELIVERY and saved on the order. deliveryZone
  // is kept so we can add the zone's shipping fee once the subtotal is known.
  let deliveryCoords: { lat: number; lng: number } | null = null;
  let deliveryZone: Awaited<ReturnType<typeof findZoneByPoint>> = null;

  if (input.deliveryType === "DELIVERY") {
    // Coverage is decided by geocoding the structured address and testing the
    // zone polygons. We re-geocode server-side (don't trust client coordinates).
    const geo = await geocodeStructured({
      street: street ?? "",
      locality: locality ?? "",
      postalCode: input.postalCode,
    });
    if (!geo) {
      throw new OrderValidationError(
        "No pudimos ubicar tu dirección. Revisá que esté completa."
      );
    }
    const zone = await findZoneByPoint(geo.lat, geo.lng);
    if (!zone) {
      throw new OrderValidationError(
        "Lo sentimos, por ahora no llegamos a tu dirección."
      );
    }
    if (!zone.daysOfWeek.includes(scheduledDate.getDay())) {
      throw new OrderValidationError(
        "Ese día no hacemos entregas en tu zona."
      );
    }
    deliveryCoords = { lat: geo.lat, lng: geo.lng };
    deliveryZone = zone;
  } else {
    // PICKUP (not enabled yet) still uses the global delivery days.
    const enabledDay = await prisma.availableDeliveryDay.findFirst({
      where: { dayOfWeek: scheduledDate.getDay(), available: true },
    });
    if (!enabledDay) {
      throw new OrderValidationError("Ese día no hay entregas disponibles.");
    }
  }

  // --- recalculate items + total from the database ---
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, available: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Products subtotal (with per-product % promos) and quantity-promo savings.
  let productsSubtotal = 0;
  let quantityPromo = 0;
  const itemsToCreate = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      throw new OrderValidationError(
        "Uno de los productos ya no está disponible."
      );
    }
    const qty = Math.floor(item.quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      throw new OrderValidationError("Cantidad inválida.");
    }
    const allowed: string[] = safeParse(product.availableBreadcrumbs);
    const disabled: string[] = safeParse(product.disabledBreadcrumbs);
    if (!allowed.includes(item.breadcrumbType) || disabled.includes(item.breadcrumbType)) {
      throw new OrderValidationError(
        `El empanado elegido no está disponible para ${product.name}.`
      );
    }
    // Unit price = empanado price with its % promo applied (per-empanado,
    // falling back to the product-wide promo).
    const bc = item.breadcrumbType;
    const pct = promoPercentForOrder(product, bc);
    const qpromo = promoTypeForOrder(product, bc);
    let unitPrice = priceForBreadcrumb(product, bc);
    if (pct > 0) unitPrice = Math.round((unitPrice * (100 - pct)) / 100);
    productsSubtotal += unitPrice * qty;
    // 2x1 / 3x2 savings for this line.
    quantityPromo += quantityPromoDiscount(qty, unitPrice, qpromo);
    return {
      productId: product.id,
      quantity: qty,
      priceAtTime: unitPrice,
      breadcrumbType: item.breadcrumbType,
    };
  });

  // Subtotal after quantity promos.
  let total = productsSubtotal - quantityPromo;

  // Discount code (validated against the post-quantity-promo subtotal).
  let appliedCode: string | null = null;
  let codeDiscount = 0;
  if (input.discountCode?.trim()) {
    const v = await validateDiscountCode(input.discountCode, total);
    if (!v.ok) throw new OrderValidationError(v.error);
    codeDiscount = v.amount;
    appliedCode = v.code;
    total -= codeDiscount;
  }

  // Add the delivery fee for the zone (free if the subtotal hits the threshold).
  const shipping = deliveryZone ? shippingFor(deliveryZone, total) : 0;
  total += shipping;

  // --- stock check: units requested per (product, empanado) ---
  // Key is `${productId}__${breadcrumb}` so each variant is checked on its own.
  const unitsByVariant = new Map<string, number>();
  for (const it of itemsToCreate) {
    const key = `${it.productId}__${it.breadcrumbType}`;
    unitsByVariant.set(key, (unitsByVariant.get(key) ?? 0) + it.quantity);
  }
  for (const [key, units] of unitsByVariant) {
    const [productId, breadcrumb] = key.split("__");
    const product = byId.get(productId)!;
    const available = stockForBreadcrumb(product, breadcrumb);
    if (available < units) {
      const label = BREADCRUMB_LABELS[breadcrumb] ?? breadcrumb;
      throw new OrderValidationError(
        available <= 0
          ? `${product.name} (${label}) está sin stock.`
          : `Solo quedan ${available} unidades de ${product.name} (${label}).`
      );
    }
  }

  // --- persist order + decrement per-empanado stock atomically ---
  // We re-read each product's stocks inside the transaction, verify there is
  // still enough, write the decremented JSON back, and keep the total `stock`
  // in sync. A guarded updateMany on `stocks` (must match what we read) makes
  // two simultaneous orders safe: the loser sees count 0 and aborts.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        status: "PENDING",
        customerName: name,
        customerPhone: phone,
        customerEmail: input.customerEmail?.trim() || null,
        notes: input.notes?.trim() || null,
        deliveryType: input.deliveryType,
        address: input.deliveryType === "DELIVERY" ? address : null,
        lat: deliveryCoords?.lat ?? null,
        lng: deliveryCoords?.lng ?? null,
        scheduledDate,
        scheduledSlot: input.scheduledSlot,
        paymentMethod: input.paymentMethod,
        shippingCost: shipping,
        discountCode: appliedCode,
        discountAmount: quantityPromo + codeDiscount,
        total,
        mpPaymentId: null,
        items: { create: itemsToCreate },
      },
      select: { id: true },
    });

    // Group requested units by product (a product may appear with >1 empanado).
    const unitsByProductBreadcrumb = new Map<string, Map<string, number>>();
    for (const [key, units] of unitsByVariant) {
      const [productId, breadcrumb] = key.split("__");
      if (!unitsByProductBreadcrumb.has(productId)) {
        unitsByProductBreadcrumb.set(productId, new Map());
      }
      unitsByProductBreadcrumb.get(productId)!.set(breadcrumb, units);
    }

    for (const [productId, perBreadcrumb] of unitsByProductBreadcrumb) {
      const current = await tx.product.findUnique({
        where: { id: productId },
        select: { stocks: true },
      });
      const stocks = parseNumberMap(current?.stocks ?? "{}");

      // Verify and compute the new per-empanado map.
      for (const [breadcrumb, units] of perBreadcrumb) {
        if ((stocks[breadcrumb] ?? 0) < units) {
          throw new OrderValidationError("Se agotó el stock de un producto.");
        }
        stocks[breadcrumb] = (stocks[breadcrumb] ?? 0) - units;
      }
      const newTotal = Object.values(stocks).reduce((a, b) => a + b, 0);

      // Guarded write: only succeeds if `stocks` is still exactly what we read.
      const res = await tx.product.updateMany({
        where: { id: productId, stocks: current?.stocks ?? "{}" },
        data: { stocks: JSON.stringify(stocks), stock: newTotal },
      });
      if (res.count === 0) {
        throw new OrderValidationError("Se agotó el stock de un producto.");
      }
    }

    return created;
  });

  // Count one use of the discount code AFTER the order transaction commits
  // (SQLite has a single writer; doing it inside would lengthen the tx). The
  // single-query guarded update is idempotent enough for this.
  if (appliedCode) {
    try {
      await consumeDiscountCode(appliedCode);
    } catch (e) {
      console.error("consumeDiscountCode failed:", e);
    }
  }

  return { id: order.id };
}

// Stock of one empanado from a product's `stocks` JSON, falling back to the
// total `stock` when no per-empanado map is set.
function stockForBreadcrumb(
  product: { stock: number; stocks: string },
  breadcrumb: string
): number {
  const map = parseNumberMap(product.stocks);
  if (Object.keys(map).length > 0) return map[breadcrumb] ?? 0;
  return product.stock ?? 0;
}

function parseNumberMap(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number") out[k] = v;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function safeParse(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Server-side price for an empanado: the specific price (> 0) from the product's
// `prices` JSON, otherwise the product's default `price`.
function priceForBreadcrumb(
  product: { price: number; prices: string },
  breadcrumb: string
): number {
  try {
    const map = JSON.parse(product.prices);
    const specific = map?.[breadcrumb];
    if (typeof specific === "number" && specific > 0) return specific;
  } catch {
    // fall through to default
  }
  return product.price ?? 0;
}

// % off for an empanado (per-empanado map, else product-wide promoPercent).
function promoPercentForOrder(
  product: { promoPercent: number; promoPercents: string },
  breadcrumb: string
): number {
  try {
    const map = JSON.parse(product.promoPercents);
    const v = map?.[breadcrumb];
    if (typeof v === "number" && v > 0) return v;
  } catch {}
  return product.promoPercent ?? 0;
}

// Quantity promo for an empanado (per-empanado map, else product-wide promoType).
function promoTypeForOrder(
  product: { promoType: string; promoTypes: string },
  breadcrumb: string
): string {
  try {
    const map = JSON.parse(product.promoTypes);
    const v = map?.[breadcrumb];
    if (v === "2x1" || v === "3x2") return v;
  } catch {}
  return product.promoType ?? "";
}
