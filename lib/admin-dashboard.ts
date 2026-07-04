import { prisma } from "@/lib/db";
import { getStockOverview } from "@/lib/admin";
import { buildSalesReport } from "@/lib/sales-report";
import { formatRemitoNumber } from "@/lib/remitos";
import { padPresupuestoNumber } from "@/lib/presupuestos";
import { normalizeClientName } from "@/lib/clients";

const LOW_STOCK = 3;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function salesHref(kind: "order" | "sale", id: string): string {
  return `/admin/operaciones/ventas/${kind}/${id}`;
}

export async function getAdminDashboardData(now = new Date()) {
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);
  const upcomingEnd = addDays(todayStart, 7);

  const [
    todayReport,
    monthReport,
    pendingOrders,
    upcomingOrders,
    stock,
    recentOrders,
    recentSales,
    recentRemitos,
    recentPresupuestos,
    unlinkedRemitos,
    monthOrders,
    monthSales,
    monthRemitos,
  ] = await Promise.all([
    buildSalesReport({ from: todayStart, to: tomorrowStart }),
    buildSalesReport({ from: monthStart, to: nextMonthStart }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "READY"] } },
    }),
    prisma.order.findMany({
      where: {
        scheduledDate: { gte: todayStart, lt: upcomingEnd },
        status: { in: ["PENDING", "CONFIRMED", "READY"] },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledSlot: "asc" }],
      take: 5,
      select: {
        id: true,
        customerName: true,
        scheduledDate: true,
        scheduledSlot: true,
        deliveryType: true,
        total: true,
        status: true,
      },
    }),
    getStockOverview(),
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        total: true,
        status: true,
      },
    }),
    prisma.manualSale.findMany({
      where: { deliveryStatus: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        soldAt: true,
        customerName: true,
        net: true,
        deliveryStatus: true,
        channel: true,
      },
    }),
    prisma.remito.findMany({
      where: { archived: false },
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 5,
      include: { items: { select: { id: true } } },
    }),
    prisma.presupuesto.findMany({
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 5,
      select: {
        id: true,
        number: true,
        date: true,
        customerName: true,
        total: true,
        status: true,
        type: true,
      },
    }),
    prisma.remito.count({ where: { archived: false, customerId: null } }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: monthStart, lt: nextMonthStart },
        status: { not: "CANCELLED" },
      },
      select: { customerId: true, customerName: true },
    }),
    prisma.manualSale.findMany({
      where: {
        soldAt: { gte: monthStart, lt: nextMonthStart },
        deliveryStatus: { not: "CANCELLED" },
      },
      select: { customerId: true, customerName: true },
    }),
    prisma.remito.findMany({
      where: {
        date: { gte: monthStart, lt: nextMonthStart },
        archived: false,
      },
      select: { customerId: true, customerName: true },
    }),
  ]);

  const lowStockItems = stock
    .filter((product) => product.available)
    .flatMap((product) =>
      product.breadcrumbs
        .filter((b) => b.stock <= LOW_STOCK)
        .map((b) => ({
          productId: product.id,
          productName: product.name,
          breadcrumb: b.code,
          stock: b.stock,
        }))
    )
    .sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName, "es"))
    .slice(0, 8);

  const activeCustomerKeys = new Set<string>();
  for (const row of [...monthOrders, ...monthSales, ...monthRemitos]) {
    const key = row.customerId ?? `name:${normalizeClientName(row.customerName ?? "")}`;
    if (key !== "name:") activeCustomerKeys.add(key);
  }

  const recentActivity = [
    ...recentOrders.map((order) => ({
      id: `order-${order.id}`,
      date: order.createdAt,
      title: order.customerName,
      detail: `Pedido web · ${order.status}`,
      amount: order.total,
      href: salesHref("order", order.id),
    })),
    ...recentSales.map((sale) => ({
      id: `sale-${sale.id}`,
      date: sale.createdAt,
      title: sale.customerName ?? "Venta sin nombre",
      detail: `Venta manual · ${sale.channel}`,
      amount: sale.net,
      href: salesHref("sale", sale.id),
    })),
    ...recentRemitos.map((remito) => ({
      id: `remito-${remito.id}`,
      date: remito.date,
      title: remito.customerName,
      detail: `${formatRemitoNumber(remito.number)} · ${remito.items.length} ítem${
        remito.items.length === 1 ? "" : "s"
      }`,
      amount: remito.total,
      href: `/admin/remitos/${remito.id}/editar`,
    })),
    ...recentPresupuestos.map((presupuesto) => ({
      id: `presupuesto-${presupuesto.id}`,
      date: presupuesto.date,
      title: presupuesto.customerName,
      detail: `Presupuesto #${padPresupuestoNumber(presupuesto.number)} · ${presupuesto.status}`,
      amount: presupuesto.total,
      href: `/admin/operaciones/presupuestos/${presupuesto.id}/editar`,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return {
    period: {
      todayStart,
      monthStart,
    },
    kpis: {
      todaySales: todayReport.general.net,
      todaySalesCount: todayReport.general.salesCount,
      monthSales: monthReport.general.net,
      monthSalesCount: monthReport.general.salesCount,
      pendingOrders,
      upcomingDeliveries: upcomingOrders.length,
      lowStock: lowStockItems.length,
      activeCustomersMonth: activeCustomerKeys.size,
    },
    attention: {
      pendingOrders,
      upcomingOrders,
      lowStockItems,
      unlinkedRemitos,
    },
    recent: {
      remitos: recentRemitos.map((remito) => ({
        id: remito.id,
        number: formatRemitoNumber(remito.number),
        customerName: remito.customerName,
        total: remito.total,
        date: remito.date,
        itemsCount: remito.items.length,
        href: `/admin/remitos/${remito.id}/editar`,
      })),
      presupuestos: recentPresupuestos.map((presupuesto) => ({
        id: presupuesto.id,
        number: `#${padPresupuestoNumber(presupuesto.number)}`,
        customerName: presupuesto.customerName,
        total: presupuesto.total,
        date: presupuesto.date,
        status: presupuesto.status,
        href: `/admin/operaciones/presupuestos/${presupuesto.id}/editar`,
      })),
      activity: recentActivity,
    },
  };
}
