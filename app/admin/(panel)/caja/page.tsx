import {
  getCashDashboard,
  getMonthlySummary,
  EXPENSE_CATEGORIES,
  CAJA_TABS,
} from "@/lib/cash";
import { resolvePeriod } from "@/lib/management";
import SubTabs from "@/components/SubTabs";
import ExpensePie from "@/components/ExpensePie";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Caja — Resumen: available balance today, money pending release grouped by
// date, and the current month's income/expense/net with a category pie.
// Reading this page also settles any due PENDING movements (in lib/cash).
export default async function CajaResumenPage() {
  const [dash, summary] = await Promise.all([
    getCashDashboard(),
    (async () => {
      const { from, to } = resolvePeriod("month");
      return getMonthlySummary(from, to);
    })(),
  ]);

  const { label: monthLabel } = resolvePeriod("month");

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Caja
      </h1>
      <SubTabs tabs={CAJA_TABS} />

      {/* Headline balances */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-black bg-ink p-6 text-white">
          <p className="font-bold uppercase tracking-widest text-[11px] text-cream">
            Saldo disponible hoy
          </p>
          <p className="mt-2 font-black text-4xl">
            {pesos(dash.availableBalance)}
          </p>
          <p className="mt-1 text-xs text-cream/80">
            Ingresos cobrados − gastos pagados
          </p>
        </div>
        <div className="rounded-xl border-2 border-line bg-white p-6">
          <p className="font-bold uppercase tracking-widest text-[11px] text-muted">
            A acreditar (próximos días)
          </p>
          <p className="mt-2 font-black text-4xl text-ink">
            {pesos(dash.pendingTotal)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Pagos de Mercado Pago pendientes de acreditación
          </p>
        </div>
      </div>

      {/* Pending releases grouped by real money_release_date */}
      <section className="mb-10">
        <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
          Acreditaciones programadas
        </h2>
        {dash.pendingByDate.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-4 py-5 text-sm text-muted">
            No hay pagos pendientes de acreditación.
          </p>
        ) : (
          <div className="space-y-2">
            {dash.pendingByDate.map((b) => (
              <div
                key={b.date.toISOString()}
                className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3"
              >
                <div>
                  <p className="font-bold capitalize text-ink">
                    {dateLabel(b.date)}
                  </p>
                  <p className="text-xs text-muted">
                    {b.count} pago{b.count === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="font-black text-ink">{pesos(b.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Monthly summary */}
      <section>
        <h2 className="mb-1 font-black uppercase tracking-tight text-lg text-ink">
          Resumen del mes
        </h2>
        <p className="mb-4 text-sm capitalize text-muted">{monthLabel}</p>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Total cobrado" value={pesos(summary.income)} kind="in" />
          <Stat
            label="Total gastado"
            value={pesos(summary.expense)}
            kind="out"
          />
          <Stat
            label="Ganancia neta"
            value={pesos(summary.net)}
            kind={summary.net >= 0 ? "in" : "out"}
            strong
          />
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <h3 className="mb-4 font-black uppercase tracking-tight text-base text-ink">
            Gastos por categoría
          </h3>
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-muted">
              Todavía no cargaste gastos este mes.
            </p>
          ) : (
            <ExpensePie
              data={summary.byCategory}
              categories={[...EXPENSE_CATEGORIES]}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  kind,
  strong,
}: {
  label: string;
  value: string;
  kind: "in" | "out";
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
      <p
        className={`mt-2 font-black text-2xl ${
          strong
            ? "text-white"
            : kind === "in"
            ? "text-green-700"
            : "text-red-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
