import Link from "next/link";
import { notFound } from "next/navigation";
import { getBarrioReport, CUSTOMER_TYPE_LABELS } from "@/lib/management";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Barrio detail: aggregated customers, orders, kg and billing (gross/net).
export default async function BarrioDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const report = await getBarrioReport(params.id);
  if (!report) notFound();

  return (
    <div>
      <Link
        href="/admin/barrios"
        className="mb-4 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
      >
        ‹ Volver a barrios
      </Link>

      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        {report.name}
      </h1>

      {/* Totals */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clientes" value={String(report.customersCount)} />
        <Stat label="Pedidos" value={String(report.ordersCount)} />
        <Stat
          label="Kg vendidos"
          value={report.qtyKg ? report.qtyKg.toFixed(1) : "—"}
        />
        <Stat label="Facturación neta" value={pesos(report.net)} strong />
      </div>
      <p className="mb-8 text-sm text-muted">
        Facturación bruta del barrio:{" "}
        <span className="font-bold text-ink">{pesos(report.gross)}</span>
      </p>

      {/* Customers in this barrio */}
      <h2 className="mb-3 font-black uppercase tracking-tight text-xl text-ink">
        Clientes
      </h2>
      {report.customers.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-6 text-sm text-muted">
          Todavía no hay clientes en este barrio.
        </p>
      ) : (
        <div className="space-y-2">
          {report.customers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clientes/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 transition-colors hover:border-black"
            >
              <div>
                <p className="font-bold uppercase tracking-tight text-ink">
                  {c.name}
                  <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {CUSTOMER_TYPE_LABELS[c.type] ?? c.type}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.orders} pedido{c.orders === 1 ? "" : "s"}
                </p>
              </div>
              <span className="font-black text-ink">{pesos(c.net)}</span>
            </Link>
          ))}
        </div>
      )}
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
      className={`rounded-lg border p-4 ${
        strong ? "border-black bg-ink text-white" : "border-line bg-white"
      }`}
    >
      <p
        className={`font-bold uppercase tracking-wide text-[10px] ${
          strong ? "text-cream" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 font-black text-xl">{value}</p>
    </div>
  );
}
