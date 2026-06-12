// Unified detail for a web Order or a manual ManualSale. Normalizes both into
// one SaleDetail shape so the admin has a single detail screen + a single set
// of actions. `kind` distinguishes them; fields that don't apply to a kind are
// left null/empty.

import { prisma } from "@/lib/db";
import { INCOME_SOURCE_LABELS } from "@/lib/cash";
import { BREADCRUMB_LABELS } from "@/lib/products";
import {
  effectiveOrderPaymentStatus,
  orderPaymentBadgeTone,
  orderPaymentMethodLabel,
  orderPaymentStatusLabel,
  type PaymentBadgeTone,
} from "@/lib/mp-order-status";

export type SaleKind = "ORDER" | "MANUAL";

export type SaleDetailItem = {
  id: string;
  productId: string | null;
  productName: string;
  breadcrumbType: string | null;
  breadcrumbLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleDetailPayment = {
  id: string;
  date: Date;
  amount: number;
  method: string;
  methodLabel: string;
  notes: string | null;
};

export type SaleDetail = {
  kind: SaleKind;
  id: string;
  shortId: string;
  status: string; // CONFIRMED | DELIVERED | CANCELLED (+ legacy)
  origin: string; // WEB | WHATSAPP | MAYORISTA | KIOSCO
  date: Date;

  // Customer
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerType: string | null; // MINORISTA | MAYORISTA | KIOSCO
  barrioName: string | null;

  // Delivery (orders only)
  deliveryType: string | null; // DELIVERY | PICKUP
  address: string | null;
  scheduledDate: Date | null;
  scheduledSlot: string | null;

  // Payment
  paymentMethod: string | null; // MERCADOPAGO | CASH (orders) | null (manual)
  paymentMethodLabel: string; // human label incl. "paga al recibir"
  paymentStatus: string; // PAID | PARTIAL | PENDING
  paymentStatusLabel: string;
  paymentTone: PaymentBadgeTone;
  paymentNote: string | null;
  dueDate: Date | null;

  // Money
  gross: number;
  discountAmount: number;
  total: number;
  paid: number;
  balance: number;

  notes: string | null;

  items: SaleDetailItem[];
  payments: SaleDetailPayment[];
};

function mapItem(it: {
  id: string;
  productId: string | null;
  productName?: string;
  product?: { name: string } | null;
  breadcrumbType: string | null;
  quantity: number;
  unitPrice?: number;
  priceAtTime?: number;
}): SaleDetailItem {
  const unitPrice = it.unitPrice ?? it.priceAtTime ?? 0;
  const bc = it.breadcrumbType ?? null;
  return {
    id: it.id,
    productId: it.productId,
    productName: it.product?.name ?? it.productName ?? "Producto",
    breadcrumbType: bc,
    breadcrumbLabel: bc ? BREADCRUMB_LABELS[bc] ?? bc : "—",
    quantity: it.quantity,
    unitPrice,
    lineTotal: unitPrice * it.quantity,
  };
}

function mapPayments(
  ps: {
    id: string;
    date: Date;
    amount: number;
    method: string;
    notes: string | null;
  }[]
): SaleDetailPayment[] {
  return ps.map((p) => ({
    id: p.id,
    date: p.date,
    amount: p.amount,
    method: p.method,
    methodLabel: INCOME_SOURCE_LABELS[p.method] ?? p.method,
    notes: p.notes,
  }));
}

export async function getSaleDetail(
  kind: SaleKind,
  id: string
): Promise<SaleDetail | null> {
  if (kind === "ORDER") {
    const o = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true } } } },
        customer: { include: { barrio: { select: { name: true } } } },
        payments: { orderBy: { date: "desc" } },
      },
    });
    if (!o) return null;
    const items = o.items.map(mapItem);
    const gross = items.reduce((a, it) => a + it.lineTotal, 0);
    // For MP orders the payment is the order itself (no Payment rows); treat an
    // approved MP order as fully paid. Cash orders are paid on delivery.
    const recordedPaid = o.payments.reduce((a, p) => a + p.amount, 0);
    const mpPaid =
      o.paymentMethod === "MERCADOPAGO" && o.mpPaymentId && o.status !== "CANCELLED"
        ? o.total
        : 0;
    const paid = Math.max(recordedPaid, mpPaid);
    const paymentStatus = effectiveOrderPaymentStatus(o);
    return {
      kind: "ORDER",
      id: o.id,
      shortId: o.id.slice(-6).toUpperCase(),
      status: o.status,
      origin: "WEB",
      date: o.createdAt,
      customerId: o.customerId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      customerType: o.customer?.type ?? null,
      barrioName: o.customer?.barrio?.name ?? null,
      deliveryType: o.deliveryType,
      address: o.address,
      scheduledDate: o.scheduledDate,
      scheduledSlot: o.scheduledSlot,
      paymentMethod: o.paymentMethod,
      paymentMethodLabel: orderPaymentMethodLabel(o),
      paymentStatus,
      paymentStatusLabel:
        orderPaymentStatusLabel(o) ??
        (paymentStatus === "PAID"
          ? "Pagado"
          : paymentStatus === "PARTIAL"
          ? "Parcial"
          : "A cobrar"),
      paymentTone: orderPaymentBadgeTone(o),
      paymentNote:
        o.paymentMethod === "MERCADOPAGO" && !o.mpPaymentId && o.status !== "CANCELLED"
          ? "Stock reservado hasta que el pago se apruebe o se cancele."
          : null,
      dueDate: o.dueDate,
      gross: gross + o.discountAmount,
      discountAmount: o.discountAmount,
      total: o.total,
      paid,
      balance: Math.max(0, o.total - paid),
      notes: o.notes,
      items,
      payments: mapPayments(o.payments),
    };
  }

  // MANUAL sale
  const s = await prisma.manualSale.findUnique({
    where: { id },
    include: {
      items: true,
      customer: { include: { barrio: { select: { name: true } } } },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!s) return null;
  const items = s.items.map(mapItem);
  // A contado manual sale (PAID) has its income auto-recorded without a Payment
  // row; treat PAID as fully paid even if there are no payment rows.
  const recordedPaid = s.payments.reduce((a, p) => a + p.amount, 0);
  const paid = s.paymentStatus === "PAID" ? Math.max(recordedPaid, s.net) : recordedPaid;
  return {
    kind: "MANUAL",
    id: s.id,
    shortId: s.id.slice(-6).toUpperCase(),
    status: s.deliveryStatus,
    origin: s.channel,
    date: s.soldAt,
    customerId: s.customerId,
    customerName: s.customerName ?? "Sin cliente",
    customerPhone: s.customer?.phone ?? null,
    customerEmail: s.customer?.email ?? null,
    customerType: s.customer?.type ?? null,
    barrioName: s.customer?.barrio?.name ?? s.neighborhood ?? null,
    deliveryType: null,
    address: null,
    scheduledDate: null,
    scheduledSlot: null,
    paymentMethod: null,
    paymentMethodLabel:
      s.paymentStatus === "PAID" ? "Cobrada" : "Cuenta corriente",
    paymentStatus: s.paymentStatus,
    paymentStatusLabel:
      s.paymentStatus === "PAID"
        ? "Pagado"
        : s.paymentStatus === "PARTIAL"
        ? "Parcial"
        : "A cobrar",
    paymentTone: s.paymentStatus === "PAID" ? "success" : "warning",
    paymentNote: null,
    dueDate: s.dueDate,
    gross: s.gross,
    discountAmount: s.discountAmount,
    total: s.net,
    paid,
    balance: Math.max(0, s.net - paid),
    notes: s.notes,
    items,
    payments: mapPayments(s.payments),
  };
}
