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
import { listProductsForAdmin } from "@/lib/admin";
import SalesReportFilters from "@/components/SalesReportFilters";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  // Los porcentajes se calculan siempre sobre esto, no sobre los kilos.
  const totalUnits = g.kg + g.packs;

  // --- datos derivados para los insights (sin tocar cálculos) ---
  const totalCorte = report.corteKg.reduce((a, c) => a + c.kgEq, 0);
  const mayorista = report.byCustomerClass.find((c) => c.class === "MAYORISTA")?.row;
  const minorista = report.byCustomerClass.find((c) => c.class === "MINORISTA")?.row;
  const topClientes = report.customers.slice(0, 6);
  const topProductosKg = [...report.byProduct]
    .filter((p) => p.kgEq > 0)
    .sort((a, b) => b.kgEq - a.kgEq)
    .slice(0, 6);
  const maxClienteNet = Math.max(1, ...topClientes.map((c) => c.net));
  const maxProductoKg = Math.max(1, ...topProductosKg.map((p) => p.kgEq));
  const maxCorte = Math.max(1, ...report.corteKg.map((c) => c.kgEq));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Resumen de ventas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Analizá ventas, kilos, productos y clientes por período.
        </p>
      </div>

      {/* Filtros (card compacta, sticky en pantallas grandes) */}
      <div className="mb-6 mt-4 lg:sticky lg:top-4 lg:z-10">
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
        <div className="space-y-6">
          {/* ===== Resumen del período: tarjetas (grilla original) ===== */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Card label="Facturación bruta" value={pesos(g.gross)} />
            <Card label="Descuentos aplicados" value={`− ${pesos(g.discount)}`} />
            <Card label="Facturación neta" value={pesos(g.net)} strong />
            <Card label="Kg vendidos" value={kg(g.kg)} />
            <Card label="Paquetes vendidos" value={units(g.packs)} hint="productos de 750 g / 500 g" />
            <Card label="Precio promedio/kg" value={g.kgEq > 0 ? pesos(g.avgPricePerKg) : "No disponible"} hint="sobre kg equivalentes" />
            <Card label="Cantidad de ventas" value={units(g.salesCount)} />
            <Card label="Ticket promedio minorista" value={g.minoristaSalesCount > 0 ? pesos(g.avgTicketMinorista) : "—"} hint="solo ventas minoristas" />
          </div>
          {g.freeTextItems > 0 && (
            <p className="-mt-3 text-[11px] text-muted">
              {g.freeTextItems} ítem(s) de texto libre (ventas manuales sin
              producto vinculado) cuentan en facturación pero no suman kg ni
              paquetes.
            </p>
          )}

          {/* ===== Insights: lectura rápida ===== */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Mayorista vs minorista */}
            <SectionCard title="Mayorista vs minorista">
              {mayorista && minorista && (
                <>
                  {/* Split por UNIDADES (kg + paquetes juntos, como el "% sobre
                      total" de las tablas), no por facturación. */}
                  <SplitBar
                    aLabel="Mayorista"
                    aValue={mayorista.kg + mayorista.packs}
                    bLabel="Minorista"
                    bValue={minorista.kg + minorista.packs}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <MiniStat label="Mayorista" net={pesos(mayorista.net)} sub={`${units(mayorista.kg + mayorista.packs)} u · ${mayorista.kgEq > 0 ? pesos(pricePerKg(mayorista)) + "/kg" : "—"}`} />
                    <MiniStat label="Minorista" net={pesos(minorista.net)} sub={`${units(minorista.kg + minorista.packs)} u · ${minorista.kgEq > 0 ? pesos(pricePerKg(minorista)) + "/kg" : "—"}`} />
                  </div>
                </>
              )}
            </SectionCard>

            {/* Kg vendidos por corte */}
            <SectionCard title="Kg vendidos por corte">
              <div className="space-y-2">
                {report.corteKg.map((c) => (
                  <BarRow
                    key={c.corte}
                    label={c.corte}
                    valueLabel={kg(c.kgEq)}
                    fraction={c.kgEq / maxCorte}
                    hint={pct(c.kgEq, totalCorte)}
                  />
                ))}
              </div>
              {report.productsNotConvertible.length > 0 && (
                <p className="mt-3 text-[11px] text-muted">
                  Sin corte asignado / sin kg-equivalente:{" "}
                  {report.productsNotConvertible.join(", ")}.
                </p>
              )}
            </SectionCard>

            {/* Top clientes */}
            <SectionCard title="Top clientes">
              {topClientes.length === 0 ? (
                <EmptyHint>Sin clientes en el período.</EmptyHint>
              ) : (
                <div className="space-y-2">
                  {topClientes.map((c) => (
                    <BarRow
                      key={c.customerId ?? c.name}
                      label={c.name}
                      valueLabel={pesos(c.net)}
                      fraction={c.net / maxClienteNet}
                      hint={CUSTOMER_CLASS_LABELS[c.type]}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Top productos por kg */}
            <SectionCard title="Top productos (kg)">
              {topProductosKg.length === 0 ? (
                <EmptyHint>Sin productos con kg en el período.</EmptyHint>
              ) : (
                <div className="space-y-2">
                  {topProductosKg.map((p) => (
                    <BarRow
                      key={p.productId}
                      label={p.name}
                      valueLabel={kg(p.kgEq)}
                      fraction={p.kgEq / maxProductoKg}
                      hint={pesos(p.net)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ===== Detalle: tablas colapsables para no saturar ===== */}
          <div className="space-y-3">
            <h2 className="font-black uppercase tracking-tight text-lg text-ink">
              Detalle
            </h2>

            <CollapsibleCard title="Ventas por producto (kg)" defaultOpen>
              <Table head={["Producto — Empanado", "Kg", "Paq.", "% sobre total"]}>
                {report.byProduct.map((p) => (
                  <Row key={p.productId}
                    cells={[p.name, kg(p.kg), units(p.packs), pct(p.kg + p.packs, totalUnits)]}
                    align={["left", "right", "right", "right"]}
                  />
                ))}
                <Row strong
                  cells={["Total", kg(totalKg), units(g.packs), "100,0%"]}
                  align={["left", "right", "right", "right"]}
                />
              </Table>
            </CollapsibleCard>

            <CollapsibleCard title="Mayorista vs minorista (detalle)">
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

            {(["MAYORISTA", "MINORISTA"] as const).map((cls) => {
              const block = report.byClassProduct[cls];
              if (block.products.length === 0) return null;
              return (
                <CollapsibleCard key={cls} title={`Facturación ${CUSTOMER_CLASS_LABELS[cls].toLowerCase()}`}>
                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card label="Bruta" value={pesos(block.summary.gross)} small />
                    <Card label="Descuento" value={pesos(block.summary.discount)} small />
                    <Card label="Neta" value={pesos(block.summary.net)} small strong />
                    <Card label="Precio promedio/kg" value={block.summary.kgEq > 0 ? pesos(pricePerKg(block.summary)) : "—"} small />
                  </div>
                  <Table head={["Producto — Empanado", "Bruta", "Descuento", "Neta", "Kg", "Paq.", "Precio/kg"]}>
                    {block.products.map((p) => (
                      <Row key={p.productId}
                        cells={[p.name, pesos(p.gross), pesos(p.discount), pesos(p.net), kg(p.kg), units(p.packs), p.kgEq > 0 ? pesos(pricePerKg(p)) : "—"]}
                        align={["left", "right", "right", "right", "right", "right", "right"]}
                      />
                    ))}
                  </Table>
                </CollapsibleCard>
              );
            })}

            <CollapsibleCard title="Facturación total por producto">
              <Table head={["Producto — Empanado", "Bruta total", "Descuento total", "Neta total", "Kg", "Paq.", "Precio/kg"]}>
                {report.byProduct.map((p) => (
                  <Row key={p.productId}
                    cells={[p.name, pesos(p.gross), pesos(p.discount), pesos(p.net), kg(p.kg), units(p.packs), p.kgEq > 0 ? pesos(pricePerKg(p)) : "—"]}
                    align={["left", "right", "right", "right", "right", "right", "right"]}
                  />
                ))}
              </Table>
            </CollapsibleCard>

            <CollapsibleCard title="Rankings de productos">
              <div className="grid gap-3 sm:grid-cols-2">
                <RankCard
                  title="Más vendidos por kg"
                  rows={[...report.byProduct].filter((p) => p.kgEq > 0).sort((a, b) => b.kgEq - a.kgEq).slice(0, 5).map((p) => ({ name: p.name, value: kg(p.kgEq) }))}
                />
                <RankCard
                  title="Los que más facturaron"
                  rows={report.byProduct.slice(0, 5).map((p) => ({ name: p.name, value: pesos(p.net) }))}
                />
                <RankCard
                  title="Mayor descuento aplicado"
                  rows={[...report.byProduct].filter((p) => p.discount > 0).sort((a, b) => b.discount - a.discount).slice(0, 5).map((p) => ({ name: p.name, value: pesos(p.discount) }))}
                />
                <RankCard
                  title="Mejor precio promedio por kg"
                  rows={[...report.byProduct].filter((p) => p.kgEq > 0).sort((a, b) => pricePerKg(b) - pricePerKg(a)).slice(0, 5).map((p) => ({ name: p.name, value: pesos(pricePerKg(p)) }))}
                />
              </div>
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
          </div>
        </div>
      )}
    </div>
  );
}

// ---- pequeños componentes de presentación ----

// Card de sección con título (para los insights).
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

// Barra dividida A vs B (mayorista/minorista) por participación en el neto.
function SplitBar({
  aLabel,
  aValue,
  bLabel,
  bValue,
}: {
  aLabel: string;
  aValue: number;
  bLabel: string;
  bValue: number;
}) {
  const total = aValue + bValue;
  const aPct = total > 0 ? (aValue / total) * 100 : 0;
  const bPct = total > 0 ? 100 - aPct : 0;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-cream">
        <div className="bg-ink" style={{ width: `${aPct}%` }} />
        <div className="bg-accent" style={{ width: `${bPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-ink align-middle" />
          {aLabel} {aPct.toFixed(0)}%
        </span>
        <span>
          {bLabel} {bPct.toFixed(0)}%
          <span className="ml-1 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
        </span>
      </div>
    </div>
  );
}

function MiniStat({ label, net, sub }: { label: string; net: string; sub: string }) {
  return (
    <div className="rounded-lg border border-line bg-cream/30 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-black text-ink">{net}</p>
      <p className="text-[10px] text-muted">{sub}</p>
    </div>
  );
}

// Fila con barra horizontal proporcional (para rankings visuales sin librerías).
function BarRow({
  label,
  valueLabel,
  fraction,
  hint,
}: {
  label: string;
  valueLabel: string;
  fraction: number;
  hint?: string;
}) {
  const width = Math.max(2, Math.min(100, fraction * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate text-ink">{label}</span>
        <span className="shrink-0 font-bold text-ink">{valueLabel}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-ink/80" style={{ width: `${width}%` }} />
        </div>
        {hint && <span className="shrink-0 text-[10px] text-muted">{hint}</span>}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-muted">{children}</p>;
}

// Card colapsable (native <details>, sin JS) para el bloque de tablas detalladas.
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

function Card({
  label,
  value,
  hint,
  strong = false,
  small = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 ${small ? "text-lg" : "text-2xl"} font-black ${strong ? "text-ink" : "text-ink"}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

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

function RankCard({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; value: string }[];
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Sin datos.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">
                <span className="text-muted">{i + 1}.</span> {r.name}
              </span>
              <span className="shrink-0 font-bold text-ink">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
