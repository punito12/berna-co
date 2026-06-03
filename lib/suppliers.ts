// Suppliers (proveedores) CRUD. Kept small; validated server-side.

import { prisma } from "@/lib/db";

// Sub-tabs for the Compras section (shared by its pages). Lives here (not in a
// page file) because Next.js forbids arbitrary named exports from route files.
export const COMPRAS_TABS = [
  { href: "/admin/compras", label: "Órdenes de compra" },
  { href: "/admin/compras/proveedores", label: "Proveedores" },
];

export const SUPPLIER_TYPES = [
  "CARNE",
  "HUEVOS",
  "PACKAGING",
  "SERVICIOS",
  "OTROS",
] as const;

export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  CARNE: "Carne",
  HUEVOS: "Huevos",
  PACKAGING: "Packaging",
  SERVICIOS: "Servicios",
  OTROS: "Otros",
};

export type SupplierInput = {
  name: string;
  type: string;
  contact?: string;
  notes?: string;
  defaultDueDays?: number;
};

function clean(input: SupplierInput) {
  const name = input.name?.trim();
  if (!name) throw new Error("El proveedor necesita un nombre.");
  const type = SUPPLIER_TYPES.includes(
    input.type as (typeof SUPPLIER_TYPES)[number]
  )
    ? input.type
    : "OTROS";
  const defaultDueDays = Math.max(
    0,
    Math.round(Number(input.defaultDueDays) || 0)
  );
  return {
    name,
    type,
    contact: input.contact?.trim() || null,
    notes: input.notes?.trim() || null,
    defaultDueDays,
  };
}

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function createSupplier(input: SupplierInput) {
  return prisma.supplier.create({ data: clean(input) });
}

export async function updateSupplier(id: string, input: SupplierInput) {
  return prisma.supplier.update({ where: { id }, data: clean(input) });
}

export async function deleteSupplier(id: string) {
  // Purchases (and their items/payments) cascade-delete with the supplier.
  await prisma.supplier.delete({ where: { id } });
}
