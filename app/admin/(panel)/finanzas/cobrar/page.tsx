import Link from "next/link";
import {
  listReceivablesByCustomer,
  getReceivablesAging,
} from "@/lib/payments";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Finanzas → Cuentas por cobrar: customers with an outstanding balance, ordered
// by amount owed, plus a global aging breakdown (0-30 / 31-60 / 60+ días).
export default async function CuentasPorCobrarPage() {
  const [customers, aging] = await Promise.all([
    listReceivablesByCustomer(),
    getReceivablesAging(),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-black uppercase tracking-tight text-3xl text-ink">
        Cuentas por cobrar
      </h1>
      <p className="mb-6 text-sm text-muted">
        Clientes con saldo pendiente, ordenados por monto.
      </p>

      {/* Aging totals */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total por cobrar" value={pesos(aging.total)} strong />
        <Stat label="0 – 30 días" value={pesos(aging.d0_30)} />
        <Stat label="31 – 60 días" value={pesos(aging.d31_60)} />
        <Stat label="60+ días" value={pesos(aging.d60plus)} warn />
      </div>

      {customers.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          No hay saldos pendientes. Todo cobrado 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => {
            const inner = (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold uppercase tracking-tight text-ink">
                    {c.customerName}
                    {c.oldestDays > 60 && (
                      <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        {c.oldestDays} días
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.salesCount} venta{c.salesCount === 1 ? "" : "s"} ·{" "}
                    {c.aging.d60plus > 0
                      ? `${pesos(c.aging.d60plus)} vencido +60d`
                      : `más antiguo: ${c.oldestDays} días`}
                  </p>
                </div>
                <span className="font-black text-lg text-ink">
                  {pesos(c.balance)}
                </span>
              </div>
            );
            return c.customerId ? (
              <Link
                key={c.customerId}
                href={`/admin/finanzas/cobrar/${c.customerId}`}
                className="block rounded-lg border border-line bg-white px-4 py-3 transition-colors hover:border-black"
              >
                {inner}
              </Link>
            ) : (
              // Free-text customer (no linked record) — not clickable.
              <div
                key={`name:${c.customerName}`}
                className="rounded-lg border border-dashed border-line bg-white px-4 py-3"
                title="Venta sin cliente vinculado"
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        strong
          ? "border-black bg-ink text-white"
          : warn
          ? "border-red-300 bg-red-50"
          : "border-line bg-white"
      }`}
    >
      <p
        className={`font-bold uppercase tracking-wide text-[10px] ${
          strong ? "text-cream" : warn ? "text-red-700" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-black text-xl ${
          warn ? "text-red-700" : strong ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
