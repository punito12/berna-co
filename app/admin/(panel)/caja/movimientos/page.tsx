import Link from "next/link";
import { listMovements, INCOME_SOURCE_LABELS, CAJA_TABS } from "@/lib/cash";
import { resolvePeriod } from "@/lib/management";
import SubTabs from "@/components/SubTabs";
import CashDeleteButton from "@/components/CashDeleteButton";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

// Caja — Movimientos: chronological history with a running balance, filterable
// by period. PENDING (MP) incomes are flagged and excluded from the running
// balance until they accrue.
export default async function CajaMovimientosPage({
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
  // Show newest first in the table, but compute the running balance oldest-first.
  const asc = await listMovements(from, to);
  const rows = [...asc].reverse();

  const PERIODS = [
    { key: "today", label: "Hoy" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Caja
      </h1>
      <SubTabs tabs={CAJA_TABS} />

      <p className="mb-4 text-sm text-muted">
        Período: <span className="font-bold capitalize text-ink">{label}</span>
      </p>

      {/* Period filter */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/caja/movimientos?period=${p.key}`}
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

      {/* History */}
      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-6 text-sm text-muted">
          No hay movimientos en este período.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Fecha", "Descripción", "Categoría", "Monto", "Saldo", ""].map(
                  (h, i) => (
                    <th
                      key={h || i}
                      className={`px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted ${
                        i >= 3 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((m) => {
                const isIncome = m.type === "INCOME";
                const pending = m.status === "PENDING";
                return (
                  <tr key={m.id} className={pending ? "bg-amber-50/60" : ""}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                      {dayLabel(m.date)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {m.description}
                      {pending && (
                        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                          A acreditar
                          {m.accrualDate ? ` ${dayLabel(m.accrualDate)}` : ""}
                        </span>
                      )}
                      {isIncome && m.source && (
                        <span className="ml-2 text-[11px] text-muted">
                          {INCOME_SOURCE_LABELS[m.source] ?? m.source}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{m.category}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${
                        isIncome ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {pesos(m.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted">
                      {pending ? "—" : pesos(m.runningBalance)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <CashDeleteButton id={m.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
