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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Resumen de ventas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Consultá facturación, kilos vendidos, clientes y medios de pago en un
          período.
        </p>
      </div>

      <div className="mb-6 mt-4">
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

      {!report.hasData ? (
        <div className="rounded-lg border border-dashed border-line bg-white px-4 py-16 text-center">
          <p className="font-bold uppercase tracking-wide text-muted">
            No hay ventas en el período seleccionado.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Resumen general */}
          <section>
            <SectionTitle>Resumen del período</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Card label="Facturación bruta" value={pesos(g.gross)} />
              <Card label="Descuentos aplicados" value={`− ${pesos(g.discount)}`} />
              <Card label="Facturación neta" value={pesos(g.net)} strong />
              <Card label="Kg vendidos" value={kg(g.kg)} />
              <Card label="Paquetes vendidos" value={units(g.packs)} hint="productos de 750 g / 500 g" />
              <Card label="Precio promedio por kg" value={g.kg > 0 ? pesos(g.avgPricePerKg) : "No disponible"} />
              <Card label="Cantidad de ventas" value={units(g.salesCount)} />
              <Card label="Ticket promedio" value={pesos(g.avgTicket)} />
            </div>
            {g.freeTextItems > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                {g.freeTextItems} ítem(s) de texto libre (ventas manuales sin
                producto vinculado) cuentan en facturación pero no suman kg ni
                paquetes.
              </p>
            )}
          </section>

          {/* 2. Kg vendidos por producto */}
          <section>
            <SectionTitle>Kg vendidos por producto</SectionTitle>
            <Table head={["Producto — Empanado", "Kg", "Paq.", "% sobre unidades"]}>
              {report.byProduct.map((p) => (
                <Row key={p.productId}
                  cells={[p.name, kg(p.kg), units(p.packs), pct(p.kg + p.packs, totalUnits)]}
                  align={["left", "right", "right", "right"]}
                />
              ))}
              <Row
                strong
                cells={["Total", kg(totalKg), units(g.packs), "100,0%"]}
                align={["left", "right", "right", "right"]}
              />
            </Table>
          </section>

          {/* 3. Mayorista vs minorista */}
          <section>
            <SectionTitle>Mayorista vs minorista</SectionTitle>
            <Table
              head={["Tipo de cliente", "Kg", "% unidades", "Paq.", "Bruta", "Descuento", "Neta", "Precio/kg"]}
            >
              {report.byCustomerClass.map((c) => (
                <Row key={c.class}
                  cells={[
                    c.label, kg(c.row.kg), pct(c.row.kg + c.row.packs, totalUnits), units(c.row.packs),
                    pesos(c.row.gross), pesos(c.row.discount), pesos(c.row.net),
                    c.row.kg > 0 ? pesos(pricePerKg(c.row)) : "—",
                  ]}
                  align={["left", "right", "right", "right", "right", "right", "right", "right"]}
                />
              ))}
              <Row strong
                cells={[
                  "Total", kg(totalKg), "100,0%", units(g.packs),
                  pesos(g.gross), pesos(g.discount), pesos(g.net),
                  g.kg > 0 ? pesos(g.avgPricePerKg) : "—",
                ]}
                align={["left", "right", "right", "right", "right", "right", "right", "right"]}
              />
            </Table>
          </section>

          {/* 4. Producto por tipo de cliente */}
          <section>
            <SectionTitle>Producto por tipo de cliente</SectionTitle>
            <Table head={["Producto — Empanado", "Kg mayorista", "Kg minorista", "Kg sin clasif.", "Kg total"]}>
              {report.productByCustomer.map((p) => (
                <Row key={p.productId}
                  cells={[p.name, kg(p.kgMayorista), kg(p.kgMinorista), kg(p.kgSinClasificar), kg(p.kgTotal)]}
                  align={["left", "right", "right", "right", "right"]}
                />
              ))}
            </Table>
          </section>

          {/* 5 + 6. Facturación mayorista / minorista */}
          {(["MAYORISTA", "MINORISTA"] as const).map((cls) => {
            const block = report.byClassProduct[cls];
            if (block.products.length === 0) return null;
            return (
              <section key={cls}>
                <SectionTitle>Facturación {CUSTOMER_CLASS_LABELS[cls].toLowerCase()}</SectionTitle>
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card label="Bruta" value={pesos(block.summary.gross)} small />
                  <Card label="Descuento" value={pesos(block.summary.discount)} small />
                  <Card label="Neta" value={pesos(block.summary.net)} small strong />
                  <Card label="Precio promedio/kg" value={block.summary.kg > 0 ? pesos(pricePerKg(block.summary)) : "—"} small />
                </div>
                <Table head={["Producto — Empanado", "Bruta", "Descuento", "Neta", "Kg", "Paq.", "Precio/kg"]}>
                  {block.products.map((p) => (
                    <Row key={p.productId}
                      cells={[p.name, pesos(p.gross), pesos(p.discount), pesos(p.net), kg(p.kg), units(p.packs), p.kg > 0 ? pesos(pricePerKg(p)) : "—"]}
                      align={["left", "right", "right", "right", "right", "right", "right"]}
                    />
                  ))}
                </Table>
              </section>
            );
          })}

          {/* 7. Facturación total por producto */}
          <section>
            <SectionTitle>Facturación total por producto</SectionTitle>
            <Table head={["Producto — Empanado", "Bruta total", "Descuento total", "Neta total", "Kg", "Paq.", "Precio/kg"]}>
              {report.byProduct.map((p) => (
                <Row key={p.productId}
                  cells={[p.name, pesos(p.gross), pesos(p.discount), pesos(p.net), kg(p.kg), units(p.packs), p.kg > 0 ? pesos(pricePerKg(p)) : "—"]}
                  align={["left", "right", "right", "right", "right", "right", "right"]}
                />
              ))}
            </Table>
          </section>

          {/* 8. Rankings */}
          <section>
            <SectionTitle>Rankings de productos</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <RankCard
                title="Más vendidos por kg"
                rows={[...report.byProduct].filter((p) => p.kg > 0).sort((a, b) => b.kg - a.kg).slice(0, 5).map((p) => ({ name: p.name, value: kg(p.kg) }))}
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
                rows={[...report.byProduct].filter((p) => p.kg > 0).sort((a, b) => pricePerKg(b) - pricePerKg(a)).slice(0, 5).map((p) => ({ name: p.name, value: pesos(pricePerKg(p)) }))}
              />
            </div>
          </section>

          {/* 9. Ranking de clientes */}
          <section>
            <SectionTitle>Ranking de clientes</SectionTitle>
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
          </section>
        </div>
      )}
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
