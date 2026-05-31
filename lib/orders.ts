// Order creation. All validation and pricing happen here on the server.
// IMPORTANT: prices and the total are recalculated from the database — the
// browser only sends product ids, the chosen empanado, and quantities.

import { prisma } from "@/lib/db";

// Thrown for invalid input; the API route turns this into a 400 with the message.
export class OrderValidationError extends Error {}

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  deliveryType: string; // DELIVERY | PICKUP
  address?: string;
  scheduledDate: string; // ISO date string
  scheduledSlot: string;
  paymentMethod: string; // CASH (MERCADOPAGO arrives in Paso 4)
  items: { productId: string; breadcrumbType: string; quantity: number }[];
};

const DELIVERY_TYPES = ["DELIVERY", "PICKUP"];
const PAYMENT_METHODS = ["CASH"]; // MERCADOPAGO not wired yet

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
  const address = input.address?.trim();
  if (input.deliveryType === "DELIVERY" && !address) {
    throw new OrderValidationError("Falta la dirección para el delivery.");
  }

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

  const [enabledDay, activeSlot] = await Promise.all([
    prisma.availableDeliveryDay.findFirst({
      where: { dayOfWeek: scheduledDate.getDay(), available: true },
    }),
    prisma.deliverySlot.findFirst({
      where: { label: input.scheduledSlot, available: true },
    }),
  ]);
  if (!enabledDay) {
    throw new OrderValidationError("Ese día no hay entregas disponibles.");
  }
  if (!activeSlot) {
    throw new OrderValidationError("Ese horario no está disponible.");
  }

  // --- recalculate items + total from the database ---
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, available: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let total = 0;
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
    if (!allowed.includes(item.breadcrumbType)) {
      throw new OrderValidationError(
        `El empanado elegido no está disponible para ${product.name}.`
      );
    }
    // Price of the chosen empanado, falling back to the product default.
    const unitPrice = priceForBreadcrumb(product, item.breadcrumbType);
    total += unitPrice * qty;
    return {
      productId: product.id,
      quantity: qty,
      priceAtTime: unitPrice,
      breadcrumbType: item.breadcrumbType,
    };
  });

  // --- stock check: total units requested per product across all breadcrumbs ---
  const unitsByProduct = new Map<string, number>();
  for (const it of itemsToCreate) {
    unitsByProduct.set(
      it.productId,
      (unitsByProduct.get(it.productId) ?? 0) + it.quantity
    );
  }
  for (const [productId, units] of unitsByProduct) {
    const product = byId.get(productId)!;
    if (product.stock < units) {
      throw new OrderValidationError(
        product.stock <= 0
          ? `${product.name} está sin stock.`
          : `Solo quedan ${product.stock} unidades de ${product.name}.`
      );
    }
  }

  // --- persist order + decrement stock atomically ---
  // The stock updates use a guarded decrement (where stock >= units) so two
  // simultaneous orders can't drive stock negative.
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
        scheduledDate,
        scheduledSlot: input.scheduledSlot,
        paymentMethod: input.paymentMethod,
        total,
        mpPaymentId: null,
        items: { create: itemsToCreate },
      },
      select: { id: true },
    });

    for (const [productId, units] of unitsByProduct) {
      const res = await tx.product.updateMany({
        where: { id: productId, stock: { gte: units } },
        data: { stock: { decrement: units } },
      });
      if (res.count === 0) {
        // Someone bought the last units between our check and here.
        throw new OrderValidationError("Se agotó el stock de un producto.");
      }
    }

    return created;
  });

  return { id: order.id };
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
