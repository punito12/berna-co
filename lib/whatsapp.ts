// Builds the "Compartir por WhatsApp" link with the full order pre-written.

import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import {
  deliveryTypeLabel,
  formatLongDate,
  paymentMethodLabel,
} from "@/lib/format";

// Business WhatsApp number (+54 9 11 5049-3297) as digits for the wa.me link.
export const BUSINESS_WHATSAPP = "5491150493297";

// The shape we need from a saved order (matches the Prisma query in the
// confirmation page: order with items, each item including its product).
export type OrderForMessage = {
  id: string;
  customerName: string;
  deliveryType: string;
  address: string | null;
  postalCode: string | null;
  scheduledDate: Date;
  scheduledSlot: string;
  paymentMethod: string;
  total: number;
  notes: string | null;
  items: {
    quantity: number;
    priceAtTime: number;
    breadcrumbType: string;
    product: { name: string };
  }[];
};

function buildMessage(order: OrderForMessage): string {
  const shortId = order.id.slice(-6).toUpperCase();
  const lines: string[] = [];

  lines.push(`¡Hola Berna&co! Hice un pedido nuevo 🛒`);
  lines.push(`Pedido #${shortId}`);
  lines.push("");
  lines.push(`Cliente: ${order.customerName}`);
  lines.push("");
  lines.push("*Productos:*");
  for (const item of order.items) {
    const empanado = BREADCRUMB_LABELS[item.breadcrumbType] ?? item.breadcrumbType;
    lines.push(
      `• ${item.quantity}x ${item.product.name} (${empanado}) — ${formatPrice(
        item.priceAtTime * item.quantity
      )}`
    );
  }
  lines.push("");
  lines.push(`*Total:* ${formatPrice(order.total)}`);
  lines.push("");
  lines.push(`Entrega: ${deliveryTypeLabel(order.deliveryType)}`);
  if (order.deliveryType === "DELIVERY" && order.address) {
    const cp = order.postalCode ? ` (CP ${order.postalCode})` : "";
    lines.push(`Dirección: ${order.address}${cp}`);
  }
  lines.push(`Cuándo: ${formatLongDate(order.scheduledDate)}, ${order.scheduledSlot}`);
  lines.push(`Pago: ${paymentMethodLabel(order.paymentMethod)}`);
  if (order.notes) {
    lines.push("");
    lines.push(`Nota: ${order.notes}`);
  }

  return lines.join("\n");
}

export function buildWhatsappUrl(order: OrderForMessage): string {
  const text = encodeURIComponent(buildMessage(order));
  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${text}`;
}
