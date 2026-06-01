// Admin "Gestión" business logic: customers, manual sales, billing dashboard
// and profitability. All money is in whole pesos. Kept separate from the
// storefront logic. API routes call these after checking isAuthenticated().

import { prisma } from "@/lib/db";

// ---- Customers ----

export const CUSTOMER_TYPES = ["MINORISTA", "MAYORISTA", "KIOSCO"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

// Suggested default discount per customer type (percent).
export const DEFAULT_DISCOUNT_BY_TYPE: Record<string, number> = {
  MINORISTA: 10,
  MAYORISTA: 25,
  KIOSCO: 30,
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  MINORISTA: "Minorista",
  MAYORISTA: "Mayorista",
  KIOSCO: "Kiosco",
};

export type CustomerInput = {
  name: string;
  type: string;
  defaultDiscount: number;
  phone?: string;
  notes?: string;
};

function cleanCustomer(input: CustomerInput) {
  const name = input.name.trim();
  if (!name) throw new Error("El cliente necesita un nombre.");
  if (!CUSTOMER_TYPES.includes(input.type as CustomerType)) {
    throw new Error("Tipo de cliente inválido.");
  }
  const discount = Math.round(Number(input.defaultDiscount));
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    throw new Error("El descuento debe estar entre 0 y 100.");
  }
  return {
    name,
    type: input.type,
    defaultDiscount: discount,
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function listCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}

export async function createCustomer(input: CustomerInput) {
  await prisma.customer.create({ data: cleanCustomer(input) });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  await prisma.customer.update({ where: { id }, data: cleanCustomer(input) });
}

// Deletes a customer. Their past sales stay (customerId is set to null), so
// history/billing is never lost.
export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
}
