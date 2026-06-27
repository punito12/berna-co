import { buildAnalyticsReport } from "@/lib/analytics";
import {
  arDayStart,
  arDayEndExclusive,
  arToday,
  arFirstOfMonth,
} from "@/lib/sales-report";
import AnalyticsFilters from "@/components/AnalyticsFilters";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
function num(n: number): string {
  return n.toLocaleString("es-AR");
}
function pctStr(n: number): string {
  return `${n.toFixed(1).replace(".", ",")}%`;
}

// Resuelve el rango [desde, hasta] (yyyy-mm-dd) según el preset o el custom.
function resolveRange(preset: string, from?: string, to?: string) {
  const today = arToday();
  if (preset === "custom" && DATE_RE.test(from ?? "") && DATE_RE.test(to ?? "")) {
    return { from: from as string, to: to as string };
  }
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to: today };
  }
  if (preset === "month") return { from: arFirstOfMonth(), to: today };
  // default 30d
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 29);
  return { from: d.toISOString().slice(0, 10), to: today };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const preset = searchParams?.preset ?? "30d";
  const { from, to } = resolveRange(preset, searchParams?.from, searchParams?.to);
  const report = await buildAnalyticsReport(
    arDayStart(from),
    arDayEndExclusive(to)
  );
  const k = report.kpis;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Analytics web
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tráfico, embudo de compra, productos y campañas del sitio público.
        </p>
      </div>

      <div className="mb-6 mt-4">
        <AnalyticsFilters preset={preset} from={from} to={to} />
      </div>

      {!report.hasData ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-4 py-20 text-center">
          <p className="font-black uppercase tracking-wide text-muted">
            No hay datos de analytics en el período.
          </p>
          <p className="mt-1 text-sm text-muted">
            Los eventos se registran a medida que los clientes navegan el sitio.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi label="Visitantes" value={num(k.visitors)} hint={`${num(k.sessions)} sesiones`} />
            <Kpi label="Vistas de producto" value={num(k.productViews)} hint={`${num(k.pageViews)} páginas`} />
            <Kpi label="Agregados al carrito" value={num(k.addToCart)} />
            <Kpi label="Checkouts iniciados" value={num(k.beginCheckout)} />
            <Kpi label="Pedidos creados" value={num(k.orders)} hint={`${pctStr(k.conversionRate)} conversión`} primary />
            <Kpi label="Ingresos (tracked)" value={pesos(k.revenue)} />
            <Kpi label="Ticket promedio" value={pesos(k.avgOrderValue)} />
          </div>

          {/* Embudo */}
          <Section title="Embudo de compra">
            <div className="space-y-3">
              {report.funnel.map((s, i) => {
                const prev = i > 0 ? report.funnel[i - 1].count : s.count;
                const stepConv = prev > 0 ? (s.count / prev) * 100 : 0;
                return (
                  <div key={s.step}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink">{s.label}</span>
                      <span className="font-bold text-ink">
                        {num(s.count)}{" "}
                        <span className="text-[11px] font-normal text-muted">
                          ({pctStr(s.pctOfTop)} del tope
                          {i > 0 ? ` · ${pctStr(stepConv)} del paso previo` : ""})
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(2, s.pctOfTop)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Productos */}
          <Section title="Productos — interés vs conversión">
            <Table head={["Producto", "Vistas", "Al carrito", "Pedidos", "Vista→carrito", "Carrito→pedido"]}>
              {report.products.map((p) => (
                <Row key={p.productId}
                  cells={[p.name, num(p.views), num(p.addToCart), num(p.orders), pctStr(p.viewToCart), pctStr(p.cartToOrderHint)]}
                  align={["left", "right", "right", "right", "right", "right"]}
                />
              ))}
            </Table>
            <p className="mt-2 text-[11px] text-muted">
              Mucha vista y poco “al carrito” = interés sin conversión (revisar
              precio/foto/stock). Mucho “al carrito” y pocos pedidos = fricción en
              el checkout.
            </p>
          </Section>

          {/* Campañas + Localidad/Pago */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Campañas (UTM)">
              {report.campaigns.length === 0 ? (
                <Empty>Sin tráfico con UTM en el período.</Empty>
              ) : (
                <Table head={["Campaña", "Origen", "Sesiones", "Pedidos", "Conv."]}>
                  {report.campaigns.map((c) => (
                    <Row key={c.campaign + c.source}
                      cells={[c.campaign, c.source, num(c.sessions), num(c.orders), pctStr(c.conversion)]}
                      align={["left", "left", "right", "right", "right"]}
                    />
                  ))}
                </Table>
              )}
            </Section>

            <Section title="Medios de pago">
              {report.payments.length === 0 ? (
                <Empty>Sin selección de pago registrada.</Empty>
              ) : (
                <Table head={["Medio", "Elegido", "Pedidos"]}>
                  {report.payments.map((p) => (
                    <Row key={p.method}
                      cells={[p.method, num(p.selected), num(p.orders)]}
                      align={["left", "right", "right"]}
                    />
                  ))}
                </Table>
              )}
            </Section>

            <Section title="Localidades">
              {report.localities.length === 0 ? (
                <Empty>Sin localidades registradas.</Empty>
              ) : (
                <Table head={["Localidad", "Checkouts", "Pedidos"]}>
                  {report.localities.map((l) => (
                    <Row key={l.locality}
                      cells={[l.locality, num(l.beginCheckout), num(l.orders)]}
                      align={["left", "right", "right"]}
                    />
                  ))}
                </Table>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- componentes de presentación ----

function Kpi({
  label,
  value,
  hint,
  primary = false,
}: {
  label: string;
  value: string;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${primary ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${primary ? "text-white/70" : "text-muted"}`}>
        {label}
      </p>
      <p className="mt-1 text-xl font-black leading-tight tabular-nums">{value}</p>
      {hint && <p className={`mt-0.5 text-[10px] ${primary ? "text-white/60" : "text-muted"}`}>{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h2 className="mb-3 font-black uppercase tracking-tight text-sm text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-muted">{children}</p>;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-line bg-cream/40">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

function Row({ cells, align }: { cells: (string | number)[]; align: ("left" | "right")[] }) {
  return (
    <tr>
      {cells.map((c, i) => (
        <td key={i} className={`px-3 py-2 ${(align[i] ?? "left") === "right" ? "text-right" : "text-left"} ${i === 0 ? "text-ink" : "text-ink/80"}`}>
          {c}
        </td>
      ))}
    </tr>
  );
}
