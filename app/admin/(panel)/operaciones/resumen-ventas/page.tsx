import {
  buildSalesReport,
  arDayStart,
  arDayEndExclusive,
  arToday,
  arFirstOfMonth,
  pricePerKg,
  CUSTOMER_CLASS_LABELS,
  type ReportFilters,
} from "@/lib/sales-report";
import { buildResumenInsights } from "@/lib/resumen-insights";
import { listProductsForAdmin } from "@/lib/admin";
import SalesReportFilters from "@/components/SalesReportFilters";
import {
  RevenueShareDonut,
  CorteBarChart,
  HorizontalBarChart,
} from "@/components/SalesChartsLazy";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---- formatters ----
function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
function kg(n: number): string {
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg`;
}
function units(n: number): string {
  return `${n.toLocaleString("es-AR")}`;
}
function pct(part: number, total: number): string {
  if (total <= 0) return "0,0%";
  return `${((part / total) * 100).toFixed(1).replace(".", ",")}%`;
}
function fecha(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ResumenVentasPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const from = DATE_RE.test(searchParams?.from ?? "")
    ? (searchParams!.from as string)
    : arFirstOfMonth();
  const to = DATE_RE.test(searchParams?.to ?? "")
    ? (searchParams!.to as string)
    : arToday();
  const customerType = searchParams?.customerType ?? "";
  const origin = searchParams?.origin ?? "";
  const paymentStatus = searchParams?.paymentStatus ?? "";
  const productId = searchParams?.productId ?? "";

  const filters: ReportFilters = {
    from: arDayStart(from),
    to: arDayEndExclusive(to),
    customerType: customerType || undefined,
    origin: origin || undefined,
    paymentStatus: paymentStatus || undefined,
    productId: productId || undefined,
  };

  const [report, products] = await Promise.all([
    buildSalesReport(filters),
    listProductsForAdmin(),
  ]);

  const g = report.general;
  const totalKg = g.kg;
  // Total de UNIDADES vendidas (cada producto = 1 unidad, sea de 1 kg o paquete).
  // Los porcentajes "% sobre total" se calculan siempre sobre esto.
  const totalUnits = g.kg + g.packs;

  // --- Mayorista vs Minorista: participación por UNIDADES y por FACTURACIÓN ---
  const mayorista = report.byCustomerClass.find((c) => c.class === "MAYORISTA")?.row;
  const minorista = report.byCustomerClass.find((c) => c.class === "MINORISTA")?.row;
  const mayUnits = (mayorista?.kg ?? 0) + (mayorista?.packs ?? 0);
  const minUnits = (minorista?.kg ?? 0) + (minorista?.packs ?? 0);
  const totalUnitsMM = mayUnits + minUnits;
  const mayNet = mayorista?.net ?? 0;
  const minNet = minorista?.net ?? 0;
  const totalNetMM = mayNet + minNet;
  const shareUnits = (v: number) => (totalUnitsMM > 0 ? (v / totalUnitsMM) * 100 : 0);
  const shareNet = (v: number) => (totalNetMM > 0 ? (v / totalNetMM) * 100 : 0);

  // --- datos para gráficos (preparados en server) ---
  const topProductosKg = [...report.byProduct]
    .filter((p) => p.kgEq > 0)
    .sort((a, b) => b.kgEq - a.kgEq)
    .slice(0, 8);
  const topProductosNet = [...report.byProduct]
    .filter((p) => p.net > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 8);
  const topClientes = report.customers.slice(0, 8);
  const revenueShareData = [
    { name: "Mayorista", value: mayNet },
    { name: "Minorista", value: minNet },
  ];
  const corteChartData = report.corteKg.map((c) => ({ corte: c.corte, kg: c.kgEq }));
  const productKgChartData = topProductosKg.map((p) => ({ name: p.name, value: p.kgEq }));
  const productNetChartData = topProductosNet.map((p) => ({ name: p.name, value: p.net }));
  const clientChartData = topClientes.map((c) => ({ name: c.name, value: c.net }));

  // Cobrado vs pendiente del período (desde medios de pago).
  const collectedTotal = report.payments.reduce((s, p) => s + p.collected, 0);
  const pendingTotal = report.payments.reduce((s, p) => s + p.pending, 0);

  // Observaciones automáticas del período (motor de reglas, lib).
  const insights = buildResumenInsights(report);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Modo presentación: al imprimir se aísla el reporte (#rv-report) y se
          ocultan nav/filtros — queda la foto ejecutiva del período. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden !important; }
            #rv-report, #rv-report * { visibility: visible !important; }
            #rv-report { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 10mm !important; }
            @page { size: A4; margin: 8mm; }
          }`,
        }}
      />

      <div className="mb-2">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Resumen de ventas
        </h1>
        <p className="mt-1 text-sm text-muted">
          La foto completa de un período: facturación, kilos, productos,
          clientes y canales.
        </p>
      </div>

      {/* Filtros (sticky, fuera del área imprimible) */}
      <div className="mb-6 mt-4 print:hidden lg:sticky lg:top-4 lg:z-10">
        <div className="rounded-xl border border-line bg-white/95 p-3 shadow-sm backdrop-blur">
          <SalesReportFilters
            from={from}
            to={to}
            customerType={customerType}
            origin={origin}
            paymentStatus={paymentStatus}
            productId={productId}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      </div>

      <div id="rv-report" className="space-y-8">
        {/* Encabezado del reporte (visible también al imprimir) */}
        <div className="rounded-xl border border-line bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-black uppercase tracking-tight text-ink">
              Berna&Co — Resumen del período
            </p>
            <p className="text-sm text-muted">
              <span className="font-bold text-ink">{fecha(from)} – {fecha(to)}</span>
              {(customerType || origin || paymentStatus || productId) && (
                <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  con filtros
                </span>
              )}
            </p>
          </div>
        </div>

        {!report.hasData ? (
          <div className="rounded-xl border border-dashed border-line bg-white px-4 py-20 text-center">
            <p className="font-black uppercase tracking-wide text-muted">
              No hay ventas en el período seleccionado.
            </p>
            <p className="mt-1 text-sm text-muted">
              Probá ampliar el rango de fechas o quitar filtros.
            </p>
          </div>
        ) : (
          <>
            {/* ===== KPIs del período ===== */}
            <section>
              <SectionTitle>Resumen del período</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <KpiCard label="Facturación neta" value={pesos(g.net)} hint={`${units(g.salesCount)} ventas`} primary />
                <KpiCard label="Facturación bruta" value={pesos(g.gross)} />
                <KpiCard label="Descuentos aplicados" value={`− ${pesos(g.discount)}`} hint={g.gross > 0 ? `${pct(g.discount, g.gross)} de la bruta` : undefined} />
                <KpiCard label="Precio promedio/kg" value={g.kgEq > 0 ? pesos(g.avgPricePerKg) : "—"} hint="sobre kg equivalentes" />
                <KpiCard label="Kg vendidos" value={kg(g.kg)} hint={`${kg(g.kgEq)} equivalentes`} />
                <KpiCard label="Paquetes vendidos" value={units(g.packs)} hint="productos de 750 g / 500 g" />
                <KpiCard label="Cantidad de ventas" value={units(g.salesCount)} />
                <KpiCard label="Ticket promedio minorista" value={g.minoristaSalesCount > 0 ? pesos(g.avgTicketMinorista) : "—"} hint="solo ventas minoristas" />
              </div>
            </section>

            {/* ===== Observaciones automáticas ===== */}
            {insights.length > 0 && (
              <section>
                <SectionTitle>Observaciones del período</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {insights.map((ins, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 text-sm leading-relaxed ${
                        ins.tone === "up"
                          ? "border-green-200 bg-green-50/60 text-green-950"
                          : ins.tone === "down"
                            ? "border-red-200 bg-red-50/60 text-red-950"
                            : ins.tone === "warn"
                              ? "border-amber-200 bg-amber-50/60 text-amber-950"
                              : "border-line bg-white text-ink"
                      }`}
                    >
                      {ins.text}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== Dashboard visual ===== */}
            <section>
              <SectionTitle>Composición del período</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Mayorista vs Minorista: AMBAS participaciones */}
                <ChartCard
                  title="Mayorista vs Minorista"
                  subtitle="Participación por facturación neta y por unidades/kg"
                >
                  {totalNetMM <= 0 ? (
                    <EmptyHint>Sin datos en el período.</EmptyHint>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted">
                          Por facturación neta
                        </p>
                        <RevenueShareDonut data={revenueShareData} />
                        <div className="mt-1 space-y-1 text-[11px]">
                          <Legend color="bg-ink" label="Mayorista" pctTxt={`${shareNet(mayNet).toFixed(0)}%`} valueTxt={pesos(mayNet)} />
                          <Legend color="bg-accent" label="Minorista" pctTxt={`${shareNet(minNet).toFixed(0)}%`} valueTxt={pesos(minNet)} />
                        </div>
                      </div>
                      <div className="flex flex-col justify-center gap-4">
                        <div>
                          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted">
                            Por unidades / kg
                          </p>
                          <div className="flex h-4 overflow-hidden rounded-full bg-cream">
                            <div className="bg-ink" style={{ width: `${shareUnits(mayUnits)}%` }} />
                            <div className="bg-accent" style={{ width: `${shareUnits(minUnits)}%` }} />
                          </div>
                          <div className="mt-2 space-y-1 text-[11px]">
                            <Legend color="bg-ink" label="Mayorista" pctTxt={`${shareUnits(mayUnits).toFixed(0)}%`} valueTxt={`${units(mayUnits)} u`} />
                            <Legend color="bg-accent" label="Minorista" pctTxt={`${shareUnits(minUnits).toFixed(0)}%`} valueTxt={`${units(minUnits)} u`} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg border border-line bg-cream/30 px-2.5 py-2">
                            <p className="font-bold uppercase tracking-wide text-muted">$/kg mayorista</p>
                            <p className="mt-0.5 text-sm font-black text-ink">{mayorista && mayorista.kgEq > 0 ? pesos(pricePerKg(mayorista)) : "—"}</p>
                          </div>
                          <div className="rounded-lg border border-line bg-cream/30 px-2.5 py-2">
                            <p className="font-bold uppercase tracking-wide text-muted">$/kg minorista</p>
                            <p className="mt-0.5 text-sm font-black text-ink">{minorista && minorista.kgEq > 0 ? pesos(pricePerKg(minorista)) : "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </ChartCard>

                {/* Cortes: kg + facturación + $/kg */}
                <ChartCard title="Performance por corte" subtitle="Kg equivalentes, facturación y precio promedio">
                  <CorteBarChart data={corteChartData} />
                  <div className="mt-3 overflow-x-auto">
                    <MiniTable head={["Corte", "Kg", "% kg", "Neta", "$/kg"]}>
                      {report.corteKg.map((c) => (
                        <tr key={c.corte} className="border-b border-line/60 last:border-0">
                          <Td>{c.corte}</Td>
                          <Td right>{kg(c.kgEq)}</Td>
                          <Td right>{pct(c.kgEq, g.kgEq)}</Td>
                          <Td right strong>{pesos(c.net)}</Td>
                          <Td right>{c.kgEq > 0 ? pesos(Math.round(c.net / c.kgEq)) : "—"}</Td>
                        </tr>
                      ))}
                    </MiniTable>
                  </div>
                  {report.productsNotConvertible.length > 0 && (
                    <p className="mt-2 text-[11px] text-muted">
                      Sin corte asignado: {report.productsNotConvertible.join(", ")}.
                    </p>
                  )}
                </ChartCard>

                <ChartCard title="Facturación por producto" subtitle="Top por facturación neta">
                  <HorizontalBarChart data={productNetChartData} unit="money" />
                </ChartCard>

                <ChartCard title="Kg por producto" subtitle="Top por kilos equivalentes">
                  <HorizontalBarChart data={productKgChartData} unit="kg" />
                </ChartCard>

                {/* Origen de las ventas (web / manual / remito) */}
                <ChartCard title="Origen de las ventas" subtitle="Pedidos web, ventas manuales y remitos">
                  <MiniTable head={["Origen", "Ventas", "Neta", "% neta", "Kg eq."]}>
                    {report.byOrigin.map((o) => (
                      <tr key={o.kind} className="border-b border-line/60 last:border-0">
                        <Td>{o.label}</Td>
                        <Td right>{units(o.count)}</Td>
                        <Td right strong>{pesos(o.net)}</Td>
                        <Td right>{pct(o.net, g.net)}</Td>
                        <Td right>{kg(o.kgEq)}</Td>
                      </tr>
                    ))}
                  </MiniTable>
                  <p className="mt-2 text-[11px] text-muted">
                    Los remitos cuentan como mayoristas y ningún origen se cuenta dos veces.
                  </p>
                </ChartCard>

                {/* Medios de pago + cobrado vs pendiente */}
                <ChartCard title="Medios de pago" subtitle="Vendido, cobrado y pendiente por medio">
                  <MiniTable head={["Medio", "Ventas", "Vendido", "Cobrado", "Pendiente"]}>
                    {report.payments.map((p) => (
                      <tr key={p.method || "none"} className="border-b border-line/60 last:border-0">
                        <Td>{p.label}</Td>
                        <Td right>{units(p.count)}</Td>
                        <Td right strong>{pesos(p.sold)}</Td>
                        <Td right>{pesos(p.collected)}</Td>
                        <Td right>{p.pending > 0 ? pesos(p.pending) : "—"}</Td>
                      </tr>
                    ))}
                  </MiniTable>
                  {pendingTotal > 0 && (
                    <p className="mt-2 text-[11px] text-muted">
                      Cobrado {pesos(collectedTotal)} · Pendiente{" "}
                      <span className="font-bold text-amber-700">{pesos(pendingTotal)}</span>{" "}
                      ({pct(pendingTotal, g.net)} de la neta).
                    </p>
                  )}
                </ChartCard>

                {/* Top clientes (ancho completo) */}
                <div className="lg:col-span-2">
                  <ChartCard title="Top clientes" subtitle="Por facturación neta">
                    {clientChartData.length === 0 ? (
                      <EmptyHint>Sin clientes en el período.</EmptyHint>
                    ) : (
                      <HorizontalBarChart data={clientChartData} unit="money" />
                    )}
                  </ChartCard>
                </div>
              </div>
            </section>

            {/* ===== Detalle: tablas completas ===== */}
            <section className="space-y-3">
              <SectionTitle>Detalle</SectionTitle>

              <CollapsibleCard title="Productos — tabla completa" defaultOpen>
                <Table head={["Producto — Empanado", "Bruta", "Descuento", "Neta", "Kg", "Paq.", "% sobre total", "Precio/kg"]}>
                  {report.byProduct.map((p) => (
                    <Row key={p.productId}
                      cells={[p.name, pesos(p.gross), pesos(p.discount), pesos(p.net), kg(p.kg), units(p.packs), pct(p.kg + p.packs, totalUnits), p.kgEq > 0 ? pesos(pricePerKg(p)) : "—"]}
                      align={["left", "right", "right", "right", "right", "right", "right", "right"]}
                    />
                  ))}
                  <Row strong
                    cells={["Total", pesos(g.gross), pesos(g.discount), pesos(g.net), kg(totalKg), units(g.packs), "100,0%", g.kgEq > 0 ? pesos(g.avgPricePerKg) : "—"]}
                    align={["left", "right", "right", "right", "right", "right", "right", "right"]}
                  />
                </Table>
              </CollapsibleCard>

              <CollapsibleCard title="Mayorista / Minorista — detalle">
                <Table head={["Tipo de cliente", "Kg", "% sobre total", "Paq.", "Bruta", "Descuento", "Neta", "Precio/kg"]}>
                  {report.byCustomerClass.map((c) => (
                    <Row key={c.class}
                      cells={[
                        c.label, kg(c.row.kg), pct(c.row.kg + c.row.packs, totalUnits), units(c.row.packs),
                        pesos(c.row.gross), pesos(c.row.discount), pesos(c.row.net),
                        c.row.kgEq > 0 ? pesos(pricePerKg(c.row)) : "—",
                      ]}
                      align={["left", "right", "right", "right", "right", "right", "right", "right"]}
                    />
                  ))}
                  <Row strong
                    cells={[
                      "Total", kg(totalKg), "100,0%", units(g.packs),
                      pesos(g.gross), pesos(g.discount), pesos(g.net),
                      g.kgEq > 0 ? pesos(g.avgPricePerKg) : "—",
                    ]}
                    align={["left", "right", "right", "right", "right", "right", "right", "right"]}
                  />
                </Table>

                {(["MAYORISTA", "MINORISTA"] as const).map((cls) => {
                  const block = report.byClassProduct[cls];
                  if (block.products.length === 0) return null;
                  return (
                    <div key={cls} className="mt-5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                        Facturación {CUSTOMER_CLASS_LABELS[cls].toLowerCase()} por producto
                      </p>
                      <Table head={["Producto — Empanado", "Bruta", "Descuento", "Neta", "Kg", "Paq.", "Precio/kg"]}>
                        {block.products.map((p) => (
                          <Row key={p.productId}
                            cells={[p.name, pesos(p.gross), pesos(p.discount), pesos(p.net), kg(p.kg), units(p.packs), p.kgEq > 0 ? pesos(pricePerKg(p)) : "—"]}
                            align={["left", "right", "right", "right", "right", "right", "right"]}
                          />
                        ))}
                      </Table>
                    </div>
                  );
                })}
              </CollapsibleCard>

              <CollapsibleCard title="Producto por tipo de cliente">
                <Table head={["Producto — Empanado", "Kg mayorista", "Kg minorista", "Kg total"]}>
                  {report.productByCustomer.map((p) => (
                    <Row key={p.productId}
                      cells={[p.name, kg(p.kgEqMayorista), kg(p.kgEqMinorista), kg(p.kgEqTotal)]}
                      align={["left", "right", "right", "right"]}
                    />
                  ))}
                </Table>
              </CollapsibleCard>

              <CollapsibleCard title="Ranking de clientes">
                <Table head={["Cliente", "Tipo", "Compras", "Kg", "Paq.", "Neta", "Descuento", "Ticket prom."]}>
                  {report.customers.map((c) => (
                    <Row key={`${c.customerId ?? c.name}`}
                      cells={[
                        c.name, CUSTOMER_CLASS_LABELS[c.type], units(c.purchases),
                        kg(c.kg), units(c.packs), pesos(c.net), pesos(c.discount),
                        pesos(c.purchases > 0 ? Math.round(c.net / c.purchases) : 0),
                      ]}
                      align={["left", "left", "right", "right", "right", "right", "right", "right"]}
                    />
                  ))}
                </Table>
              </CollapsibleCard>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ---- pequeños componentes de presentación ----

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
      {children}
    </h2>
  );
}

// Tarjeta KPI del período. `primary` invierte colores (facturación neta).
// Valores en una sola línea (tabular-nums + nowrap) para que nunca se corten.
function KpiCard({
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
      <p className={`text-[11px] font-bold uppercase tracking-wide ${primary ? "text-white/70" : "text-muted"}`}>
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-xl font-black leading-tight tabular-nums xl:text-2xl">
        {value}
      </p>
      {hint && (
        <p className={`mt-0.5 text-[10px] ${primary ? "text-white/60" : "text-muted"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

// Card contenedora de un gráfico o bloque visual: título + subtítulo + contenido.
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3">
        <h3 className="font-black uppercase tracking-tight text-sm text-ink">
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Fila de leyenda para el bloque M/M (color + etiqueta + % + valor).
function Legend({
  color,
  label,
  pctTxt,
  valueTxt,
}: {
  color: string;
  label: string;
  pctTxt: string;
  valueTxt: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-ink">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-bold text-ink">
        {pctTxt} <span className="font-normal text-muted">· {valueTxt}</span>
      </span>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-muted">{children}</p>;
}

// Card colapsable (native <details>, sin JS) para las tablas de detalle.
function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-line bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-cream/40">
        <span className="font-black uppercase tracking-tight text-sm text-ink">
          {title}
        </span>
        <span className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}

// Tabla compacta para dentro de las ChartCards (sin borde exterior propio).
function MiniTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full min-w-[380px] text-sm">
      <thead>
        <tr className="border-b border-line bg-cream/40">
          {head.map((h, i) => (
            <th key={i} className={`px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-muted ${i === 0 ? "text-left" : "text-right"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({
  children,
  right = false,
  strong = false,
}: {
  children: React.ReactNode;
  right?: boolean;
  strong?: boolean;
}) {
  return (
    <td className={`px-2.5 py-2 ${right ? "text-right" : "text-left"} ${strong ? "font-bold text-ink" : "text-ink/80"}`}>
      {children}
    </td>
  );
}

// Tabla completa de detalle (con scroll horizontal propio).
function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-line bg-cream/40">
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted ${i === 0 ? "text-left" : "text-right"}`}
              >
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

function Row({
  cells,
  align,
  strong = false,
}: {
  cells: (string | number)[];
  align: ("left" | "right")[];
  strong?: boolean;
}) {
  return (
    <tr className={strong ? "bg-cream/30 font-bold" : ""}>
      {cells.map((c, i) => (
        <td
          key={i}
          className={`px-3 py-2 ${(align[i] ?? "left") === "right" ? "text-right" : "text-left"} ${i === 0 ? "text-ink" : "text-ink/80"}`}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}
