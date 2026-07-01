import {
  comparePeriods,
  resolvePreset,
  type Delta,
  type PeriodRange,
} from "@/lib/inteligencia-comercial";
import ICFilters from "@/components/ICFilters";
import { ComparisonBars, RevenueShareDonut } from "@/components/SalesChartsLazy";

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
function kgf(n: number): string {
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg`;
}
function num(n: number): string {
  return n.toLocaleString("es-AR");
}
function pctf(n: number): string {
  return `${n.toFixed(1).replace(".", ",")}%`;
}
function fmtBy(format: "money" | "kg" | "int" | "pct", n: number): string {
  if (format === "money") return pesos(n);
  if (format === "kg") return kgf(n);
  if (format === "pct") return pctf(n);
  return num(n);
}
function fecha(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-");
  return `${d}/${m}/${y}`;
}
function periodLabel(p: PeriodRange): string {
  return `${fecha(p.from)} – ${fecha(p.to)}`;
}

export default async function InteligenciaComercialPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const preset = searchParams?.preset ?? "month";
  let periods = resolvePreset(preset);
  if (
    preset === "custom" &&
    DATE_RE.test(searchParams?.fromA ?? "") &&
    DATE_RE.test(searchParams?.toA ?? "") &&
    DATE_RE.test(searchParams?.fromB ?? "") &&
    DATE_RE.test(searchParams?.toB ?? "")
  ) {
    periods = {
      periodA: { from: searchParams!.fromA as string, to: searchParams!.toA as string },
      periodB: { from: searchParams!.fromB as string, to: searchParams!.toB as string },
    };
  }

  const r = await comparePeriods(periods.periodA, periods.periodB);
  const { periodA, periodB } = periods;

  // datos para gráficos (server-side, top 8)
  const topNet = r.products.filter((p) => p.net.b > 0 || p.net.a > 0).slice(0, 8);
  const topNetData = topNet.map((p) => ({ name: p.name, a: p.net.a, b: p.net.b }));
  const topKg = [...r.products]
    .sort((x, y) => y.kgEq.b - x.kgEq.b || y.kgEq.a - x.kgEq.a)
    .slice(0, 8);
  const topKgData = topKg.map((p) => ({ name: p.name, a: p.kgEq.a, b: p.kgEq.b }));
  const corteData = r.cortes.map((c) => ({ name: c.corte, a: c.kgEq.a, b: c.kgEq.b }));
  const growers = r.products
    .filter((p) => p.net.a > 0 && p.net.abs > 0)
    .sort((x, y) => y.net.abs - x.net.abs)
    .slice(0, 5);
  const decliners = r.products
    .filter((p) => p.net.a > 0 && p.net.abs < 0)
    .sort((x, y) => x.net.abs - y.net.abs)
    .slice(0, 5);
  const newProducts = r.products.filter((p) => p.rankA === null && p.net.b > 0);
  const goneProducts = r.products.filter((p) => p.rankB === null && p.net.a > 0);
  const topClients = r.clients.filter((c) => c.rankB !== null).slice(0, 10);
  const clientGrowers = r.clients
    .filter((c) => c.status === "retenido" && c.net.abs > 0)
    .sort((x, y) => y.net.abs - x.net.abs)
    .slice(0, 5);
  const clientDecliners = r.clients
    .filter((c) => c.status === "retenido" && c.net.abs < 0)
    .sort((x, y) => x.net.abs - y.net.abs)
    .slice(0, 5);
  const donutB = [
    { name: "Mayorista", value: r.classMix.find((c) => c.class === "MAYORISTA")?.net.b ?? 0 },
    { name: "Minorista", value: r.classMix.find((c) => c.class === "MINORISTA")?.net.b ?? 0 },
  ];
  const funnelMaxB = Math.max(1, ...r.analytics.funnel.map((f) => f.d.b));

  const noData = !r.hasDataA && !r.hasDataB;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Modo presentación: al imprimir se aísla el reporte (#ic-report) y se
          ocultan nav/filtros — queda una vista ejecutiva limpia. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden !important; }
            #ic-report, #ic-report * { visibility: visible !important; }
            #ic-report { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 10mm !important; }
            @page { size: A4; margin: 8mm; }
          }`,
        }}
      />

      <div className="mb-2">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Inteligencia Comercial
        </h1>
        <p className="mt-1 text-sm text-muted">
          Compará períodos, detectá oportunidades y analizá el rendimiento
          comercial de Berna&Co.
        </p>
      </div>

      <div className="mb-6 mt-4 print:hidden">
        <ICFilters
          preset={preset}
          fromA={periodA.from}
          toA={periodA.to}
          fromB={periodB.from}
          toB={periodB.to}
        />
      </div>

      <div id="ic-report" className="space-y-8">
        {/* Encabezado del reporte (visible también en modo presentación) */}
        <div className="rounded-xl border border-line bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-black uppercase tracking-tight text-ink">
              Berna&Co — Reporte comercial
            </p>
            <p className="text-sm text-muted">
              <span className="font-bold text-ink">B:</span> {periodLabel(periodB)}
              <span className="mx-2 text-line">|</span>
              <span className="font-bold text-ink">A (base):</span> {periodLabel(periodA)}
            </p>
          </div>
        </div>

        {noData ? (
          <div className="rounded-xl border border-dashed border-line bg-white px-4 py-20 text-center">
            <p className="font-black uppercase tracking-wide text-muted">
              No hay ventas en ninguno de los dos períodos.
            </p>
            <p className="mt-1 text-sm text-muted">Probá con otras fechas.</p>
          </div>
        ) : (
          <>
            {/* ===== KPIs ejecutivos ===== */}
            <section>
              <SectionTitle>Resumen ejecutivo</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {r.kpis.map((k) => (
                  <KpiCompareCard key={k.key} label={k.label} hint={k.hint} format={k.format} d={k.d} primary={k.key === "net"} />
                ))}
              </div>
            </section>

            {/* ===== Observaciones automáticas ===== */}
            {r.insights.length > 0 && (
              <section>
                <SectionTitle>Observaciones automáticas</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {r.insights.map((ins, i) => (
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

            {/* ===== ¿Qué explicó el crecimiento? ===== */}
            <section>
              <SectionTitle>¿Qué explicó el crecimiento?</SectionTitle>
              <div className="rounded-xl border border-line bg-white p-4">
                <p className="mb-4 text-sm text-muted">
                  Variación de facturación neta:{" "}
                  <span className={`font-black ${r.growth.revenueDelta >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {r.growth.revenueDelta >= 0 ? "+" : ""}{pesos(r.growth.revenueDelta)}
                  </span>
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <ContributionSplit
                    title="Volumen vs precio/mix"
                    items={[
                      { label: "Efecto volumen (kg)", value: r.growth.volumeEffect },
                      { label: "Efecto precio/mix", value: r.growth.priceMixEffect },
                    ]}
                  />
                  <ContributionSplit
                    title="Cantidad de ventas vs ticket"
                    items={[
                      { label: "Efecto cantidad de ventas", value: r.growth.countEffect },
                      { label: "Efecto ticket promedio", value: r.growth.ticketEffect },
                    ]}
                  />
                </div>
              </div>
            </section>

            {/* ===== Canales / tipo de cliente ===== */}
            <section>
              <SectionTitle>Canales y tipo de cliente</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Mayorista vs Minorista" subtitle="Participación por facturación y por unidades — A vs B">
                  <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
                    <div>
                      <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted">
                        Neta período B
                      </p>
                      <RevenueShareDonut data={donutB} />
                    </div>
                    <div className="space-y-4 self-center">
                      {r.classMix.map((c) => (
                        <div key={c.class}>
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="font-bold text-ink">{c.label}</span>
                            <DeltaBadge d={c.net} />
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted">
                            Neta: {pesos(c.net.a)} → <span className="font-bold text-ink">{pesos(c.net.b)}</span>
                          </p>
                          <p className="text-[11px] text-muted">
                            Share facturación: {pctf(c.netShareA)} → {pctf(c.netShareB)} <PpBadge pp={c.netSharePp} />
                          </p>
                          <p className="text-[11px] text-muted">
                            Share unidades/kg: {pctf(c.unitShareA)} → {pctf(c.unitShareB)} <PpBadge pp={c.unitSharePp} />
                          </p>
                          <p className="text-[11px] text-muted">
                            Precio/kg: {pesos(c.pricePerKgA)} → {pesos(c.pricePerKgB)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Origen de las ventas" subtitle="Web / manual / remitos — A vs B">
                  <Table head={["Origen", "Ventas", "Neta A", "Neta B", "Δ", "Share B"]}>
                    {r.origins.map((o) => (
                      <tr key={o.kind} className="border-b border-line/60 last:border-0">
                        <Td>{o.label}</Td>
                        <Td right>{num(o.count.a)} → <b>{num(o.count.b)}</b></Td>
                        <Td right>{pesos(o.net.a)}</Td>
                        <Td right strong>{pesos(o.net.b)}</Td>
                        <Td right><DeltaBadge d={o.net} /></Td>
                        <Td right>{pctf(o.netShareB)} <PpBadge pp={o.netSharePp} /></Td>
                      </tr>
                    ))}
                  </Table>
                  <p className="mt-2 text-[11px] text-muted">
                    Los remitos cuentan como mayoristas. Ningún origen se cuenta dos veces.
                  </p>
                </ChartCard>
              </div>
            </section>

            {/* ===== Productos ===== */}
            <section>
              <SectionTitle>Performance por producto</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Top productos por facturación" subtitle="Período A (gris) vs período B (negro)">
                  <ComparisonBars data={topNetData} unit="money" />
                </ChartCard>
                <ChartCard title="Top productos por kg" subtitle="Kg equivalentes — A vs B">
                  <ComparisonBars data={topKgData} unit="kg" />
                </ChartCard>
                <ChartCard title="Mayores crecimientos" subtitle="Por variación de facturación neta">
                  <MiniMoveTable rows={growers.map((p) => ({ name: p.name, from: p.net.a, to: p.net.b, d: p.net }))} />
                </ChartCard>
                <ChartCard title="Mayores caídas" subtitle="Por variación de facturación neta">
                  <MiniMoveTable rows={decliners.map((p) => ({ name: p.name, from: p.net.a, to: p.net.b, d: p.net }))} />
                </ChartCard>
              </div>

              {(newProducts.length > 0 || goneProducts.length > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {newProducts.length > 0 && (
                    <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-green-800">
                        Con ventas solo en el período B (nuevos / relanzados)
                      </p>
                      <ul className="space-y-1 text-sm">
                        {newProducts.map((p) => (
                          <li key={p.productId} className="flex justify-between gap-2">
                            <span className="text-ink">{p.name}</span>
                            <span className="font-bold text-ink">{pesos(p.net.b)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {goneProducts.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                        Sin ventas en el período B (vendían en A)
                      </p>
                      <ul className="space-y-1 text-sm">
                        {goneProducts.map((p) => (
                          <li key={p.productId} className="flex justify-between gap-2">
                            <span className="text-ink">{p.name}</span>
                            <span className="text-muted">vendía {pesos(p.net.a)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <details className="group mt-4 overflow-hidden rounded-xl border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-cream/40">
                  <span className="font-black uppercase tracking-tight text-sm text-ink">
                    Tabla completa por producto
                  </span>
                  <span className="text-muted transition-transform group-open:rotate-180">▾</span>
                </summary>
                <div className="overflow-x-auto border-t border-line p-4">
                  <Table head={["Producto", "Neta A", "Neta B", "Δ", "Kg A", "Kg B", "$/kg B", "Ranking"]}>
                    {r.products.map((p) => (
                      <tr key={p.productId} className="border-b border-line/60 last:border-0">
                        <Td>{p.name}</Td>
                        <Td right>{pesos(p.net.a)}</Td>
                        <Td right strong>{pesos(p.net.b)}</Td>
                        <Td right><DeltaBadge d={p.net} /></Td>
                        <Td right>{kgf(p.kgEq.a)}</Td>
                        <Td right>{kgf(p.kgEq.b)}</Td>
                        <Td right>{p.pricePerKgB > 0 ? pesos(p.pricePerKgB) : "—"}</Td>
                        <Td right><RankMove a={p.rankA} b={p.rankB} /></Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </details>
            </section>

            {/* ===== Cortes ===== */}
            <section>
              <SectionTitle>Performance por corte</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Kg por corte" subtitle="A (gris) vs B (negro), en kg equivalentes">
                  <ComparisonBars data={corteData} unit="kg" />
                </ChartCard>
                <ChartCard title="Detalle por corte" subtitle="Share de kg y precio promedio">
                  <Table head={["Corte", "Kg A", "Kg B", "Δ", "Share B", "$/kg B"]}>
                    {r.cortes.map((c) => (
                      <tr key={c.corte} className="border-b border-line/60 last:border-0">
                        <Td>{c.corte}</Td>
                        <Td right>{kgf(c.kgEq.a)}</Td>
                        <Td right strong>{kgf(c.kgEq.b)}</Td>
                        <Td right><DeltaBadge d={c.kgEq} /></Td>
                        <Td right>{pctf(c.kgShareB)}</Td>
                        <Td right>{c.pricePerKgB > 0 ? pesos(c.pricePerKgB) : "—"}</Td>
                      </tr>
                    ))}
                  </Table>
                </ChartCard>
              </div>
            </section>

            {/* ===== Clientes ===== */}
            <section>
              <SectionTitle>Clientes</SectionTitle>
              <div className="rounded-xl border border-line bg-white p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">
                  Top 10 del período B
                </p>
                <div className="overflow-x-auto">
                  <Table head={["#", "Cliente", "Tipo", "Compras", "Neta A", "Neta B", "Δ", "Share B", "Ranking"]}>
                    {topClients.map((c) => (
                      <tr key={c.key} className="border-b border-line/60 last:border-0">
                        <Td strong>#{c.rankB}</Td>
                        <Td>{c.name}</Td>
                        <Td>{c.type === "MAYORISTA" ? "Mayorista" : "Minorista"}</Td>
                        <Td right>{num(c.purchases.a)} → <b>{num(c.purchases.b)}</b></Td>
                        <Td right>{pesos(c.net.a)}</Td>
                        <Td right strong>{pesos(c.net.b)}</Td>
                        <Td right><DeltaBadge d={c.net} /></Td>
                        <Td right>{pctf(c.netShareB)}</Td>
                        <Td right><RankMove a={c.rankA} b={c.rankB} /></Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ChartCard title="Clientes que más crecieron" subtitle="Retenidos, por variación de neta">
                  <MiniMoveTable rows={clientGrowers.map((c) => ({ name: c.name, from: c.net.a, to: c.net.b, d: c.net }))} />
                </ChartCard>
                <ChartCard title="Clientes que más cayeron" subtitle="Retenidos, por variación de neta">
                  <MiniMoveTable rows={clientDecliners.map((c) => ({ name: c.name, from: c.net.a, to: c.net.b, d: c.net }))} />
                </ChartCard>
                <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-green-800">
                    Clientes nuevos ({r.newClients.length})
                  </p>
                  {r.newClients.length === 0 ? (
                    <p className="text-sm text-muted">Sin clientes nuevos en el período.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {r.newClients.slice(0, 8).map((c) => (
                        <li key={c.key} className="flex justify-between gap-2">
                          <span className="text-ink">{c.name}</span>
                          <span className="font-bold text-ink">{pesos(c.net.b)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                    Clientes perdidos ({r.lostClients.length})
                  </p>
                  {r.lostClients.length === 0 ? (
                    <p className="text-sm text-muted">Ningún cliente del período A dejó de comprar.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {r.lostClients.slice(0, 8).map((c) => (
                        <li key={c.key} className="flex justify-between gap-2">
                          <span className="text-ink">{c.name}</span>
                          <span className="text-muted">compraba {pesos(c.net.a)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* ===== Funnel web ===== */}
            <section>
              <SectionTitle>Ecommerce / funnel web</SectionTitle>
              {!r.analytics.hasData ? (
                <div className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">
                  Sin datos de analytics web en estos períodos (el tracking
                  registra desde su activación).
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard title="Embudo de compra" subtitle="A vs B por paso">
                    <div className="space-y-3">
                      {r.analytics.funnel.map((f) => (
                        <div key={f.step}>
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="text-ink">{f.label}</span>
                            <span className="font-bold text-ink">
                              {num(f.d.a)} → {num(f.d.b)} <DeltaBadge d={f.d} />
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream">
                            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(2, (f.d.b / funnelMaxB) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                      <p className="pt-1 text-[11px] text-muted">
                        Sesiones: {num(r.analytics.sessions.a)} → {num(r.analytics.sessions.b)} · Conversión: {pctf(r.analytics.conversion.a)} → {pctf(r.analytics.conversion.b)}
                      </p>
                    </div>
                  </ChartCard>
                  <div className="space-y-4">
                    <ChartCard title="Campañas (UTM) — período B" subtitle="Sesiones, pedidos y conversión">
                      {r.analytics.campaignsB.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted">Sin tráfico con UTM.</p>
                      ) : (
                        <Table head={["Campaña", "Sesiones", "Pedidos", "Conv."]}>
                          {r.analytics.campaignsB.map((c) => (
                            <tr key={c.campaign} className="border-b border-line/60 last:border-0">
                              <Td>{c.campaign}</Td>
                              <Td right>{num(c.sessions)}</Td>
                              <Td right>{num(c.orders)}</Td>
                              <Td right>{pctf(c.conversion)}</Td>
                            </tr>
                          ))}
                        </Table>
                      )}
                    </ChartCard>
                    <ChartCard title="Localidades (checkout) — período B" subtitle="Solo localidad general, nunca dirección exacta">
                      {r.analytics.localitiesB.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted">Sin localidades registradas.</p>
                      ) : (
                        <Table head={["Localidad", "Checkouts", "Pedidos"]}>
                          {r.analytics.localitiesB.slice(0, 8).map((l) => (
                            <tr key={l.locality} className="border-b border-line/60 last:border-0">
                              <Td>{l.locality}</Td>
                              <Td right>{num(l.beginCheckout)}</Td>
                              <Td right>{num(l.orders)}</Td>
                            </tr>
                          ))}
                        </Table>
                      )}
                    </ChartCard>
                  </div>
                </div>
              )}
            </section>

            {/* ===== Pagos y descuentos ===== */}
            <section>
              <SectionTitle>Medios de pago y descuentos</SectionTitle>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Medios de pago" subtitle="Ventas y monto — A vs B">
                  <Table head={["Medio", "Ventas", "Vendido A", "Vendido B", "Δ"]}>
                    {r.payments.map((p) => (
                      <tr key={p.method} className="border-b border-line/60 last:border-0">
                        <Td>{p.label}</Td>
                        <Td right>{num(p.count.a)} → <b>{num(p.count.b)}</b></Td>
                        <Td right>{pesos(p.sold.a)}</Td>
                        <Td right strong>{pesos(p.sold.b)}</Td>
                        <Td right><DeltaBadge d={p.sold} /></Td>
                      </tr>
                    ))}
                  </Table>
                </ChartCard>
                <ChartCard title="Descuentos" subtitle="Incluye promos, +5 unidades (10% OFF), códigos y método de pago">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-line bg-cream/30 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Total descuentos</p>
                      <p className="mt-1 text-lg font-black text-ink">{pesos(r.discounts.total.b)}</p>
                      <p className="text-[11px] text-muted">antes {pesos(r.discounts.total.a)} · <DeltaBadge d={r.discounts.total} /></p>
                    </div>
                    <div className="rounded-lg border border-line bg-cream/30 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Tasa sobre bruta</p>
                      <p className="mt-1 text-lg font-black text-ink">{pctf(r.discounts.rateB)}</p>
                      <p className="text-[11px] text-muted">antes {pctf(r.discounts.rateA)} · <PpBadge pp={r.discounts.ratePp} /></p>
                    </div>
                  </div>
                </ChartCard>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ---- componentes de presentación ----

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
      {children}
    </h2>
  );
}

// Badge de variación: verde sube, rojo baja, gris igual, "nuevo" sin base.
function DeltaBadge({ d }: { d: Delta }) {
  if (d.pct === null) {
    return d.b > 0 ? (
      <span className="rounded bg-cream px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">nuevo</span>
    ) : (
      <span className="text-[10px] text-muted">—</span>
    );
  }
  const cls =
    d.dir === "up"
      ? "bg-green-100 text-green-800"
      : d.dir === "down"
        ? "bg-red-100 text-red-700"
        : "bg-cream text-muted";
  const arrow = d.dir === "up" ? "▲" : d.dir === "down" ? "▼" : "＝";
  const sign = d.pct >= 0 ? "+" : "";
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {arrow} {sign}{d.pct.toFixed(1).replace(".", ",")}%
    </span>
  );
}

// Badge de puntos porcentuales (para shares/mix).
function PpBadge({ pp }: { pp: number }) {
  if (Math.abs(pp) < 0.05) return <span className="text-[10px] text-muted">(=)</span>;
  const cls = pp > 0 ? "text-green-700" : "text-red-700";
  return (
    <span className={`text-[10px] font-bold ${cls}`}>
      ({pp > 0 ? "+" : ""}{pp.toFixed(1).replace(".", ",")} pp)
    </span>
  );
}

// Tarjeta KPI comparativa: valor B grande, valor A abajo, badge de delta.
function KpiCompareCard({
  label,
  hint,
  format,
  d,
  primary = false,
}: {
  label: string;
  hint?: string;
  format: "money" | "kg" | "int" | "pct";
  d: Delta;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${primary ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${primary ? "text-white/70" : "text-muted"}`}>
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p className="text-xl font-black leading-tight tabular-nums">{fmtBy(format, d.b)}</p>
        <DeltaBadge d={d} />
      </div>
      <p className={`mt-0.5 text-[10px] ${primary ? "text-white/60" : "text-muted"}`}>
        antes: {fmtBy(format, d.a)}{hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}

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
        <h3 className="font-black uppercase tracking-tight text-sm text-ink">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Barras de contribución (descomposición del crecimiento): dos efectos que
// suman exactamente la variación total.
function ContributionSplit({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{title}</p>
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink">{i.label}</span>
              <span className={`font-bold ${i.value >= 0 ? "text-green-700" : "text-red-700"}`}>
                {i.value >= 0 ? "+" : ""}{pesos(i.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream">
              <div
                className={`h-full rounded-full ${i.value >= 0 ? "bg-green-600" : "bg-red-500"}`}
                style={{ width: `${Math.max(2, (Math.abs(i.value) / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tabla chica "de X a Y" con badge (crecimientos/caídas de productos/clientes).
function MiniMoveTable({
  rows,
}: {
  rows: { name: string; from: number; to: number; d: Delta }[];
}) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">Sin movimientos relevantes.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="flex items-baseline justify-between gap-2 text-sm">
          <span className="min-w-0 truncate text-ink">{r.name}</span>
          <span className="shrink-0 whitespace-nowrap text-muted">
            {pesos(r.from)} → <span className="font-bold text-ink">{pesos(r.to)}</span> <DeltaBadge d={r.d} />
          </span>
        </li>
      ))}
    </ul>
  );
}

// Movimiento de ranking: ↑2 / ↓1 / = / nuevo / salió.
function RankMove({ a, b }: { a: number | null; b: number | null }) {
  if (a === null && b === null) return <span className="text-muted">—</span>;
  if (a === null) return <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-800">nuevo #{b}</span>;
  if (b === null) return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">salió (era #{a})</span>;
  const diff = a - b; // positivo = subió
  if (diff === 0) return <span className="text-[11px] text-muted">= #{b}</span>;
  return (
    <span className={`text-[11px] font-bold ${diff > 0 ? "text-green-700" : "text-red-700"}`}>
      {diff > 0 ? "↑" : "↓"}{Math.abs(diff)} · #{a}→#{b}
    </span>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
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
    </div>
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
