// Builds the "Compartir por WhatsApp" link with the full order pre-written.

import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import {
  deliveryTypeLabel,
  formatLongDate,
  paymentMethodLabel,
} from "@/lib/format";

// Business WhatsApp number (+54 11 2545-0304) as digits for the wa.me link.
// AR mobile links need the "9" after the country code: 54 9 11 ...
export const BUSINESS_WHATSAPP = "5491125450304";

// The shape we need from a saved order (matches the Prisma query in the
// confirmation page: order with items, each item including its product).
export type OrderForMessage = {
  id: string;
  customerName: string;
  deliveryType: string;
  address: string | null;
  scheduledDate: Date;
  scheduledSlot: string;
  paymentMethod: string;
  shippingCost: number;
  total: number;
  notes: string | null;
  items: {
    quantity: number;
    priceAtTime: number;
    breadcrumbType: string;
    product: { name: string };
  }[];
};

// Replaces {pedidoId}, {total}, {cliente} in a CMS template. Used as the
// message header when a template is provided.
export function fillWhatsappTemplate(
  template: string,
  vars: { pedidoId: string; total: string; cliente: string }
): string {
  return template
    .replace(/\{pedidoId\}/g, vars.pedidoId)
    .replace(/\{total\}/g, vars.total)
    .replace(/\{cliente\}/g, vars.cliente);
}

function buildMessage(order: OrderForMessage, template?: string): string {
  const shortId = order.id.slice(-6).toUpperCase();
  const lines: string[] = [];

  if (template && template.trim()) {
    // CMS-provided header (with placeholders) replaces the default greeting.
    lines.push(
      fillWhatsappTemplate(template, {
        pedidoId: shortId,
        total: formatPrice(order.total),
        cliente: order.customerName,
      })
    );
  } else {
    lines.push(`¡Hola Berna&co! Hice un pedido nuevo 🛒`);
    lines.push(`Pedido #${shortId}`);
    lines.push("");
    lines.push(`Cliente: ${order.customerName}`);
  }
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
  if (order.deliveryType === "DELIVERY") {
    lines.push(
      `Envío: ${order.shippingCost > 0 ? formatPrice(order.shippingCost) : "Gratis"}`
    );
  }
  lines.push(`*Total:* ${formatPrice(order.total)}`);
  lines.push("");
  lines.push(`Entrega: ${deliveryTypeLabel(order.deliveryType)}`);
  if (order.deliveryType === "DELIVERY" && order.address) {
    lines.push(`Dirección: ${order.address}`);
  }
  lines.push(`Cuándo: ${formatLongDate(order.scheduledDate)}, ${order.scheduledSlot}`);
  lines.push(`Pago: ${paymentMethodLabel(order.paymentMethod)}`);
  if (order.notes) {
    lines.push("");
    lines.push(`Nota: ${order.notes}`);
  }

  return lines.join("\n");
}

export function buildWhatsappUrl(
  order: OrderForMessage,
  template?: string
): string {
  const text = encodeURIComponent(buildMessage(order, template));
  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${text}`;
}
