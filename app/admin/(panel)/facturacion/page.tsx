import Link from "next/link";
import {
  getBillingReport,
  resolvePeriod,
  SALE_CHANNEL_LABELS,
} from "@/lib/management";
import SubTabs from "@/components/SubTabs";

const FACT_TABS = [
  { href: "/admin/facturacion", label: "Facturación" },
  { href: "/admin/facturacion/barrios", label: "Barrios" },
];

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Billing dashboard: period filter + totals + breakdowns by product / customer
// / channel. Combines manual sales and web orders. Monthly close is automatic
// (the default period is the current month).
export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  const preset = searchParams.period ?? "month";
  const { from, to, label } = resolvePeriod(
    preset,
    searchParams.from,
    searchParams.to
  );
  const report = await getBillingReport(from, to);

  const PERIODS = [
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Facturación
      </h1>
      <SubTabs tabs={FACT_TABS} />
      <p className="mb-6 text-sm text-muted">
        Período: <span className="font-bold text-ink">{label}</span>. Incluye
        ventas manuales y pedidos web.
      </p>

      {/* Period filter */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/facturacion?period=${p.key}`}
              className={`px-3 py-2 font-bold uppercase tracking-wide text-xs transition-colors ${
                preset === p.key
                  ? "bg-black text-white"
                  : "border border-line text-ink hover:border-black"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        {preset === "custom" && (
          <form className="flex flex-wrap items-end gap-2" method="get">
            <input type="hidden" name="period" value="custom" />
            <label className="block">
              <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                Desde
              </span>
              <input
                type="date"
                name="from"
                defaultValue={searchParams.from}
                className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                Hasta
              </span>
              <input
                type="date"
                name="to"
                defaultValue={searchParams.to}
                className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <button
              type="submit"
              className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white"
            >
              Aplicar
            </button>
          </form>
        )}
      </div>

      {/* Totals */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Facturación bruta" value={pesos(report.totals.gross)} />
        <Stat label="Descuentos" value={`− ${pesos(report.totals.discount)}`} />
        <Stat
          label="Facturación neta"
          value={pesos(report.totals.net)}
          strong
        />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Por producto">
          {report.byProduct.length === 0 ? (
            <Empty />
          ) : (
            <Table
              head={["Producto", "Kg", "Unid.", "Neto"]}
              rows={report.byProduct.map((p) => [
                p.name,
                p.qtyKg ? p.qtyKg.toFixed(1) : "—",
                p.units ? String(p.units) : "—",
                pesos(p.net),
              ])}
            />
          )}
        </Panel>

        <Panel title="Por cliente">
          {report.byCustomer.length === 0 ? (
            <Empty />
          ) : (
            <Table
              head={["Cliente", "Ventas", "Neto"]}
              rows={report.byCustomer.map((c) => [
                c.name,
                String(c.salesCount),
                pesos(c.net),
              ])}
            />
          )}
        </Panel>

        <Panel title="Por canal">
          {report.byChannel.length === 0 ? (
            <Empty />
          ) : (
            <Table
              head={["Canal", "Bruto", "Neto"]}
              rows={report.byChannel.map((c) => [
                SALE_CHANNEL_LABELS[c.channel] ?? c.channel,
                pesos(c.gross),
                pesos(c.net),
              ])}
            />
          )}
        </Panel>

        <Panel title="Por barrio">
          {report.byNeighborhood.length === 0 ? (
            <p className="text-sm text-muted">
              Sin barrios cargados en este período. Cargá barrio en los clientes
              (o asignalo a un pedido web desde Pedidos).
            </p>
          ) : (
            <Table
              head={["Barrio", "Kg", "Bruto", "Neto"]}
              rows={report.byNeighborhood.map((b) => [
                b.neighborhood,
                b.qtyKg ? b.qtyKg.toFixed(1) : "—",
                pesos(b.gross),
                pesos(b.net),
              ])}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        strong ? "border-black bg-ink text-white" : "border-line bg-white"
      }`}
    >
      <p
        className={`font-bold uppercase tracking-wide text-[11px] ${
          strong ? "text-cream" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 font-black text-2xl">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line">
        <tr>
          {head.map((h, i) => (
            <th
              key={h}
              className={`pb-2 font-bold uppercase tracking-wide text-[10px] text-muted ${
                i > 0 ? "text-right" : ""
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td
                key={j}
                className={`py-2 ${
                  j === 0 ? "text-ink" : "text-right text-muted"
                } ${j === r.length - 1 ? "font-bold text-ink" : ""}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty() {
  return <p className="text-sm text-muted">Sin datos en este período.</p>;
}
