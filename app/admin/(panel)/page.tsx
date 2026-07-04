import Link from "next/link";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { BREADCRUMB_LABELS } from "@/lib/products";
import { deliveryTypeLabel } from "@/lib/format";

function shortDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function fullDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatAdminMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function KpiCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-line bg-white p-4 transition-colors hover:border-black"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-2 font-black uppercase tracking-tight text-2xl text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Link>
  );
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-black uppercase tracking-tight text-xl text-ink">
        {title}
      </h2>
      {action}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboardData();
  const todayLabel = fullDate(dashboard.period.todayStart);
  const month = monthLabel(dashboard.period.monthStart);
  const quickActions = [
    { href: "/admin/operaciones/ventas", label: "Ver pedidos y ventas" },
    { href: "/admin/ventas", label: "Cargar venta manual" },
    { href: "/admin/entregas", label: "Ver entregas" },
    { href: "/admin/remitos/nuevo", label: "Crear remito" },
    { href: "/admin/operaciones/presupuestos/nuevo", label: "Crear presupuesto" },
    { href: "/admin/stock", label: "Ver stock" },
    { href: "/admin/operaciones/resumen-ventas", label: "Ver resumen de ventas" },
    {
      href: "/admin/operaciones/inteligencia-comercial",
      label: "Ver inteligencia comercial",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Resumen operativo de Berna&Co ·{" "}
            <span className="capitalize">{todayLabel}</span>
          </p>
        </div>
        <Link
          href="/admin/operaciones/ventas"
          className="bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
        >
          Ir a operaciones
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas de hoy"
          value={formatAdminMoney(dashboard.kpis.todaySales)}
          detail={`${dashboard.kpis.todaySalesCount} operación${
            dashboard.kpis.todaySalesCount === 1 ? "" : "es"
          } registrada${dashboard.kpis.todaySalesCount === 1 ? "" : "s"}`}
          href="/admin/operaciones/resumen-ventas"
        />
        <KpiCard
          label="Ventas del mes"
          value={formatAdminMoney(dashboard.kpis.monthSales)}
          detail={`${dashboard.kpis.monthSalesCount} operación${
            dashboard.kpis.monthSalesCount === 1 ? "" : "es"
          } en ${month}`}
          href="/admin/operaciones/resumen-ventas"
        />
        <KpiCard
          label="Pedidos pendientes"
          value={String(dashboard.kpis.pendingOrders)}
          detail="Web sin entregar ni cancelar"
          href="/admin/operaciones/ventas"
        />
        <KpiCard
          label="Stock bajo"
          value={String(dashboard.kpis.lowStock)}
          detail="Variantes en 3 unidades o menos"
          href="/admin/stock"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-line bg-white p-4">
          <SectionTitle
            title="Requiere atención"
            action={
              <Link
                href="/admin/operaciones/ventas"
                className="font-bold uppercase tracking-widest text-[11px] text-muted underline hover:text-ink"
              >
                Ver operaciones
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/operaciones/ventas?status=CONFIRMED"
              className="rounded border border-line bg-cream/30 p-3 hover:border-black"
            >
              <p className="font-black uppercase tracking-tight text-lg text-ink">
                {dashboard.attention.pendingOrders}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                pedidos activos
              </p>
            </Link>
            <Link
              href="/admin/stock"
              className="rounded border border-line bg-cream/30 p-3 hover:border-black"
            >
              <p className="font-black uppercase tracking-tight text-lg text-ink">
                {dashboard.attention.lowStockItems.length}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                variantes con bajo stock
              </p>
            </Link>
            <Link
              href="/admin/remitos?cliente=sin-vincular"
              className="rounded border border-line bg-cream/30 p-3 hover:border-black"
            >
              <p className="font-black uppercase tracking-tight text-lg text-ink">
                {dashboard.attention.unlinkedRemitos}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                remitos sin cliente vinculado
              </p>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                Próximas entregas
              </p>
              {dashboard.attention.upcomingOrders.length === 0 ? (
                <p className="rounded border border-line px-3 py-4 text-sm text-muted">
                  No hay entregas próximas pendientes.
                </p>
              ) : (
                <div className="space-y-2">
                  {dashboard.attention.upcomingOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/operaciones/ventas/order/${order.id}`}
                      className="block rounded border border-line px-3 py-2 hover:border-black"
                    >
                      <p className="font-bold text-sm text-ink">
                        {shortDate(order.scheduledDate)} · {order.scheduledSlot}
                      </p>
                      <p className="text-xs text-muted">
                        {order.customerName} · {deliveryTypeLabel(order.deliveryType)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                Stock bajo
              </p>
              {dashboard.attention.lowStockItems.length === 0 ? (
                <p className="rounded border border-line px-3 py-4 text-sm text-muted">
                  No hay productos en alerta de stock.
                </p>
              ) : (
                <div className="space-y-2">
                  {dashboard.attention.lowStockItems.slice(0, 5).map((item) => (
                    <Link
                      key={`${item.productId}-${item.breadcrumb}`}
                      href="/admin/stock"
                      className="block rounded border border-line px-3 py-2 hover:border-black"
                    >
                      <p className="font-bold text-sm text-ink">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted">
                        {BREADCRUMB_LABELS[item.breadcrumb] ?? item.breadcrumb}:{" "}
                        <span className="font-bold text-ink">{item.stock}</span>
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4">
          <SectionTitle title="Acciones rápidas" />
          <div className="grid gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded border border-line px-3 py-2 text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:border-black hover:bg-cream/40"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-line bg-white p-4">
          <SectionTitle
            title="Actividad reciente"
            action={
              <Link
                href="/admin/operaciones/ventas"
                className="font-bold uppercase tracking-widest text-[11px] text-muted underline hover:text-ink"
              >
                Ver todo
              </Link>
            }
          />
          {dashboard.recent.activity.length === 0 ? (
            <p className="rounded border border-line px-3 py-6 text-center text-sm text-muted">
              Todavía no hay actividad reciente.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {dashboard.recent.activity.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-cream/30"
                >
                  <div>
                    <p className="font-bold text-sm text-ink">{activity.title}</p>
                    <p className="text-xs text-muted">
                      {shortDate(activity.date)} · {activity.detail}
                    </p>
                  </div>
                  <span className="font-black text-sm text-ink">
                    {formatAdminMoney(activity.amount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-4">
            <SectionTitle
              title="Remitos recientes"
              action={
                <Link
                  href="/admin/remitos"
                  className="font-bold uppercase tracking-widest text-[11px] text-muted underline hover:text-ink"
                >
                  Ver remitos
                </Link>
              }
            />
            {dashboard.recent.remitos.length === 0 ? (
              <p className="text-sm text-muted">No hay remitos recientes.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recent.remitos.map((remito) => (
                  <Link
                    key={remito.id}
                    href={remito.href}
                    className="block rounded border border-line px-3 py-2 hover:border-black"
                  >
                    <p className="font-bold text-sm text-ink">
                      {remito.number} · {remito.customerName}
                    </p>
                    <p className="text-xs text-muted">
                      {shortDate(remito.date)} · {remito.itemsCount} ítem
                      {remito.itemsCount === 1 ? "" : "s"} ·{" "}
                      {formatAdminMoney(remito.total)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <SectionTitle
              title="Presupuestos recientes"
              action={
                <Link
                  href="/admin/operaciones/presupuestos"
                  className="font-bold uppercase tracking-widest text-[11px] text-muted underline hover:text-ink"
                >
                  Ver presupuestos
                </Link>
              }
            />
            {dashboard.recent.presupuestos.length === 0 ? (
              <p className="text-sm text-muted">No hay presupuestos recientes.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recent.presupuestos.map((presupuesto) => (
                  <Link
                    key={presupuesto.id}
                    href={presupuesto.href}
                    className="block rounded border border-line px-3 py-2 hover:border-black"
                  >
                    <p className="font-bold text-sm text-ink">
                      {presupuesto.number} · {presupuesto.customerName}
                    </p>
                    <p className="text-xs text-muted">
                      {shortDate(presupuesto.date)} · {presupuesto.status} ·{" "}
                      {formatAdminMoney(presupuesto.total)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-muted">
        Este dashboard es un resumen operativo. Para análisis contable completo,
        usá Resumen de ventas o Inteligencia Comercial.
      </p>
    </div>
  );
}
