// Payment methods + their config (singleton). The store offers three methods;
// efectivo/transferencia can carry a % discount off the products subtotal, and
// transferencia shows alias/CBU/WhatsApp to send the receipt.

import { prisma } from "@/lib/db";

export const PAYMENT_SINGLETON_ID = "singleton";

// Canonical payment methods. CASH (legacy) is treated as EFECTIVO.
export const PAYMENT_METHODS = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "MERCADOPAGO",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function normalizePaymentMethod(m: string): PaymentMethod {
  if (m === "CASH") return "EFECTIVO";
  if (PAYMENT_METHODS.includes(m as PaymentMethod)) return m as PaymentMethod;
  return "EFECTIVO";
}

export type PaymentMethodConfigValues = {
  efectivoDiscountPercent: number;
  transferenciaDiscountPercent: number;
  aliasMercadoPago: string;
  cbu: string;
  whatsappNumber: string;
};

export async function getPaymentConfig(): Promise<PaymentMethodConfigValues> {
  let cfg = await prisma.paymentMethodConfig.findUnique({
    where: { id: PAYMENT_SINGLETON_ID },
  });
  if (!cfg) {
    cfg = await prisma.paymentMethodConfig.create({
      data: { id: PAYMENT_SINGLETON_ID },
    });
  }
  return {
    efectivoDiscountPercent: cfg.efectivoDiscountPercent,
    transferenciaDiscountPercent: cfg.transferenciaDiscountPercent,
    aliasMercadoPago: cfg.aliasMercadoPago,
    cbu: cfg.cbu,
    whatsappNumber: cfg.whatsappNumber,
  };
}

export async function updatePaymentConfig(
  input: PaymentMethodConfigValues
): Promise<void> {
  const pct = (n: number) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
  const data = {
    efectivoDiscountPercent: pct(input.efectivoDiscountPercent),
    transferenciaDiscountPercent: pct(input.transferenciaDiscountPercent),
    aliasMercadoPago: input.aliasMercadoPago?.trim() || "",
    cbu: input.cbu?.trim() || "",
    whatsappNumber: input.whatsappNumber?.trim() || "",
  };
  await prisma.paymentMethodConfig.upsert({
    where: { id: PAYMENT_SINGLETON_ID },
    update: data,
    create: { id: PAYMENT_SINGLETON_ID, ...data },
  });
}

// The % discount for a method (0 for MP). Used to recompute the total.
export function discountPercentFor(
  cfg: PaymentMethodConfigValues,
  method: string
): number {
  const m = normalizePaymentMethod(method);
  if (m === "EFECTIVO") return cfg.efectivoDiscountPercent;
  if (m === "TRANSFERENCIA") return cfg.transferenciaDiscountPercent;
  return 0;
}
