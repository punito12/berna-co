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
    total += product.price * qty;
    return {
      productId: product.id,
      quantity: qty,
      priceAtTime: product.price,
      breadcrumbType: item.breadcrumbType,
    };
  });

  // --- persist as PENDING ---
  const order = await prisma.order.create({
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
