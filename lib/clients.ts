// Registro centralizado de clientes (Customer): normalización, dedupe y merge.
// Mantiene una sola identidad por cliente aunque el nombre se haya tipeado
// distinto (mayúsculas/acentos/espacios). NO toca dinero ni stock: solo la
// identidad del cliente y la reasignación de a qué cliente apunta cada registro.

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// Normaliza un nombre de cliente para comparar/deduplicar. NO se usa para
// mostrar: el nombre visible conserva su forma linda (mayúsculas/acentos).
//   "LA PROVEEDURÍA"   → "la proveeduria"
//   "La Proveeduría"   → "la proveeduria"
//   "la   proveeduria" → "la proveeduria"
//   "Tienda Nova  S.A." → "tienda nova s a"  (puntuación → espacio, colapsada)
export function normalizeClientName(name: string): string {
  return (name ?? "")
    .normalize("NFD") // separa diacríticos
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // puntuación/símbolos → espacio
    .trim()
    .replace(/\s+/g, " "); // colapsa espacios repetidos
}

// Busca un cliente existente cuyo nombre normalizado coincide exactamente con el
// del input. Devuelve el más antiguo (createdAt asc) si hubiera varios (caso de
// duplicados todavía no mergeados), para reusar siempre el mismo. Carga liviana:
// trae solo lo necesario para comparar en memoria (el modelo no guarda el
// normalizado, así que normalizamos al vuelo).
export async function findCustomerByNormalizedName(
  name: string,
  tx?: Prisma.TransactionClient
): Promise<{ id: string; name: string; type: string } | null> {
  const target = normalizeClientName(name);
  if (!target) return null;
  const db = tx ?? prisma;
  const all = await db.customer.findMany({
    select: { id: true, name: true, type: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return all.find((c) => normalizeClientName(c.name) === target) ?? null;
}

// Clientes cuyo nombre normalizado *contiene* (o está contenido en) el query
// normalizado. Acento/caso/espacio-insensible. Para sugerencias de autocomplete
// y para avisar "ya existe un cliente similar".
export async function searchCustomersFuzzy(
  query: string,
  limit = 20
): Promise<{ id: string; name: string; type: string }[]> {
  const q = normalizeClientName(query);
  const all = await prisma.customer.findMany({
    select: { id: true, name: true, type: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  if (!q) return all.slice(0, limit);
  return all
    .filter((c) => {
      const n = normalizeClientName(c.name);
      return n.includes(q) || q.includes(n);
    })
    .slice(0, limit);
}

// Guarda anti-duplicado en la creación: dado un nombre (y datos opcionales),
// reusa el cliente existente con el mismo nombre normalizado o crea uno nuevo.
// Devuelve el cliente y si fue creado. Usado por remitos/ventas/atajos de "nuevo
// cliente" para que tipear "LA PROVEEDURÍA" reuse "La Proveeduría".
export async function findOrCreateCustomerByName(
  args: {
    name: string;
    type?: string;
    phone?: string | null;
    source?: string;
  },
  tx?: Prisma.TransactionClient
): Promise<{ customer: { id: string; name: string; type: string }; created: boolean }> {
  const db = tx ?? prisma;
  const name = args.name.trim();
  const existing = await findCustomerByNormalizedName(name, tx);
  if (existing) return { customer: existing, created: false };
  const customer = await db.customer.create({
    data: {
      name,
      type: args.type ?? "MINORISTA",
      phone: args.phone?.trim() || null,
      source: args.source ?? "MANUAL",
    },
    select: { id: true, name: true, type: true },
  });
  return { customer, created: true };
}

// ---- Detección de duplicados -------------------------------------------------

export type DuplicateClient = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  orders: number;
  sales: number;
  remitos: number;
  presupuestos: number;
  createdAt: Date;
};

export type DuplicateGroup = {
  normalized: string;
  clients: DuplicateClient[];
};

// Agrupa clientes por nombre normalizado y devuelve solo los grupos con 2+
// miembros (los duplicados reales). Incluye conteos de remitos/ventas/pedidos/
// presupuestos para que el admin decida con datos. Los remitos se cuentan por
// customerId si el modelo lo soporta (columna agregada) — si un remito viejo
// solo tiene texto, no cuenta acá hasta que se lo vincule.
export async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      phone: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          sales: true,
          remitos: true,
          presupuestos: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, DuplicateClient[]>();
  for (const c of customers) {
    const key = normalizeClientName(c.name);
    if (!key) continue;
    const row: DuplicateClient = {
      id: c.id,
      name: c.name,
      type: c.type,
      phone: c.phone,
      email: c.email,
      orders: c._count.orders,
      sales: c._count.sales,
      remitos: c._count.remitos,
      presupuestos: c._count.presupuestos,
      createdAt: c.createdAt,
    };
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }

  return [...groups.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([normalized, clients]) => ({ normalized, clients }))
    .sort((a, b) => b.clients.length - a.clients.length);
}

// ---- Merge transaccional -----------------------------------------------------

export type MergeResult = {
  primaryId: string;
  mergedIds: string[];
  reassigned: {
    orders: number;
    sales: number;
    remitos: number;
    presupuestos: number;
  };
};

// Funde una lista de clientes duplicados dentro del primario. TODO el historial
// (pedidos web, ventas manuales, remitos y presupuestos) se reasigna al primario
// y luego se borran SOLO los registros de cliente duplicados (ya vacíos). No se
// borra ni modifica ninguna venta/remito/pedido/presupuesto, ni montos, ni
// stock. Todo en una sola transacción: si algo falla, se revierte completo.
export async function mergeCustomers(
  primaryId: string,
  duplicateIds: string[]
): Promise<MergeResult> {
  const dupIds = duplicateIds.filter((id) => id && id !== primaryId);
  if (dupIds.length === 0) {
    throw new Error("Elegí al menos un cliente duplicado distinto del primario.");
  }

  return prisma.$transaction(async (tx) => {
    const primary = await tx.customer.findUnique({ where: { id: primaryId } });
    if (!primary) throw new Error("El cliente primario no existe.");
    const dups = await tx.customer.findMany({ where: { id: { in: dupIds } } });
    if (dups.length !== dupIds.length) {
      throw new Error("Alguno de los clientes a fusionar no existe.");
    }

    // Reasignar todo lo que apunta a los duplicados → primario.
    const orders = await tx.order.updateMany({
      where: { customerId: { in: dupIds } },
      data: { customerId: primaryId },
    });
    const sales = await tx.manualSale.updateMany({
      where: { customerId: { in: dupIds } },
      data: { customerId: primaryId },
    });
    const remitos = await tx.remito.updateMany({
      where: { customerId: { in: dupIds } },
      data: { customerId: primaryId },
    });
    const presupuestos = await tx.presupuesto.updateMany({
      where: { customerId: { in: dupIds } },
      data: { customerId: primaryId },
    });

    // Los duplicados ya no tienen relaciones → borrar solo esos registros de
    // cliente (NO ventas/remitos/pedidos, que ya viven bajo el primario).
    await tx.customer.deleteMany({ where: { id: { in: dupIds } } });

    return {
      primaryId,
      mergedIds: dupIds,
      reassigned: {
        orders: orders.count,
        sales: sales.count,
        remitos: remitos.count,
        presupuestos: presupuestos.count,
      },
    };
  });
}

// Remitos viejos cuyo cliente NO está en el registro: tienen customerName de
// texto pero customerId null y ningún Customer normaliza igual. Se agrupan por
// nombre normalizado para ofrecer registrarlos+vincularlos de una. (Distinto de
// linkLegacyRemitosToCustomer, que vincula a un cliente que YA existe.)
export type OrphanRemitoGroup = {
  normalized: string;
  displayName: string; // el nombre tal como figura en el/los remito(s)
  remitos: number;
};

export async function findOrphanRemitoClients(): Promise<OrphanRemitoGroup[]> {
  const [customers, remitos] = await Promise.all([
    prisma.customer.findMany({ select: { name: true } }),
    prisma.remito.findMany({
      where: { customerId: null },
      select: { customerName: true },
    }),
  ]);
  const registered = new Set(customers.map((c) => normalizeClientName(c.name)));
  const groups = new Map<string, OrphanRemitoGroup>();
  for (const r of remitos) {
    const norm = normalizeClientName(r.customerName);
    if (!norm || registered.has(norm)) continue; // ya registrado o vacío
    const g = groups.get(norm);
    if (g) g.remitos += 1;
    else
      groups.set(norm, {
        normalized: norm,
        displayName: r.customerName.trim(),
        remitos: 1,
      });
  }
  return [...groups.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}

// Registra un cliente mayorista a partir de un nombre huérfano y vincula todos
// los remitos de texto que normalizan igual. Transaccional. Reusa el cliente si
// ya existiera por nombre normalizado (no duplica). Devuelve el cliente y cuántos
// remitos quedaron vinculados.
export async function registerAndLinkOrphanRemitos(
  displayName: string,
  type = "MAYORISTA"
): Promise<{ customerId: string; name: string; linked: number }> {
  const name = displayName.trim();
  if (!name) throw new Error("Falta el nombre del cliente.");
  return prisma.$transaction(async (tx) => {
    const { customer } = await findOrCreateCustomerByName(
      { name, type, source: "MANUAL" },
      tx
    );
    const target = normalizeClientName(name);
    const orphans = await tx.remito.findMany({
      where: { customerId: null },
      select: { id: true, customerName: true },
    });
    const ids = orphans
      .filter((r) => normalizeClientName(r.customerName) === target)
      .map((r) => r.id);
    let linked = 0;
    if (ids.length > 0) {
      const res = await tx.remito.updateMany({
        where: { id: { in: ids } },
        data: { customerId: customer.id },
      });
      linked = res.count;
    }
    return { customerId: customer.id, name: customer.name, linked };
  });
}

// Vincula remitos viejos (solo texto) a un cliente registrado por nombre
// normalizado. Devuelve cuántos se vincularon. No reescribe el customerName
// visible; solo setea customerId donde estaba vacío y el nombre normaliza igual.
export async function linkLegacyRemitosToCustomer(
  customerId: string
): Promise<number> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true },
  });
  if (!customer) throw new Error("Cliente no encontrado.");
  const target = normalizeClientName(customer.name);
  const orphans = await prisma.remito.findMany({
    where: { customerId: null },
    select: { id: true, customerName: true },
  });
  const matchIds = orphans
    .filter((r) => normalizeClientName(r.customerName) === target)
    .map((r) => r.id);
  if (matchIds.length === 0) return 0;
  const res = await prisma.remito.updateMany({
    where: { id: { in: matchIds } },
    data: { customerId },
  });
  return res.count;
}
