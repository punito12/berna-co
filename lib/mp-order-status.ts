type MpOrderStatusInput = {
  paymentMethod: string | null;
  status: string;
  mpPaymentId?: string | null;
  paymentStatus?: string;
};

export type PaymentBadgeTone = "success" | "warning" | "danger" | "neutral";

export function isMercadoPagoOrder(order: {
  paymentMethod: string | null;
}): boolean {
  return order.paymentMethod === "MERCADOPAGO";
}

export function mpPaymentState(
  order: MpOrderStatusInput
): "NOT_MP" | "PENDING" | "APPROVED" | "CANCELLED" {
  if (!isMercadoPagoOrder(order)) return "NOT_MP";
  if (order.status === "CANCELLED") return "CANCELLED";
  if (order.mpPaymentId) return "APPROVED";
  return "PENDING";
}

export function orderPaymentListLabel(order: MpOrderStatusInput): string {
  const state = mpPaymentState(order);
  if (state === "APPROVED") return "MP aprobado";
  if (state === "PENDING") return "MP pendiente de pago";
  if (state === "CANCELLED") return "MP cancelado/rechazado";
  const status =
    order.paymentStatus === "PAID"
      ? "pagado"
      : order.paymentStatus === "PARTIAL"
      ? "parcial"
      : "pendiente";
  if (order.paymentMethod === "TRANSFERENCIA") return `Transferencia ${status}`;
  return `Efectivo ${status}`;
}

export function orderPaymentMethodLabel(order: MpOrderStatusInput): string {
  const state = mpPaymentState(order);
  if (state === "APPROVED") return "Mercado Pago (aprobado)";
  if (state === "PENDING") return "Mercado Pago (pendiente de pago)";
  if (state === "CANCELLED") return "Mercado Pago (cancelado/rechazado)";
  if (order.paymentMethod === "TRANSFERENCIA") return "Transferencia bancaria";
  if (order.paymentMethod === "CASH" || order.paymentMethod === "EFECTIVO") {
    return "Efectivo (paga al recibir)";
  }
  return "—";
}

export function orderPaymentStatusLabel(order: MpOrderStatusInput): string | null {
  const state = mpPaymentState(order);
  if (state === "APPROVED") return "Pagado";
  if (state === "PENDING") return "Pendiente de pago";
  if (state === "CANCELLED") return "Cancelado/rechazado";
  return null;
}

export function orderPaymentBadgeTone(order: MpOrderStatusInput): PaymentBadgeTone {
  const state = mpPaymentState(order);
  if (state === "APPROVED") return "success";
  if (state === "PENDING") return "warning";
  if (state === "CANCELLED") return "danger";
  if (order.paymentStatus === "PAID") return "success";
  if (order.paymentStatus === "PARTIAL") return "warning";
  if (order.paymentStatus === "PENDING") return "warning";
  return "neutral";
}

export function effectiveOrderPaymentStatus(
  order: MpOrderStatusInput & { paymentStatus: string }
): string {
  const state = mpPaymentState(order);
  if (state === "APPROVED") return "PAID";
  if (state === "PENDING" || state === "CANCELLED") return "PENDING";
  return order.paymentStatus;
}
