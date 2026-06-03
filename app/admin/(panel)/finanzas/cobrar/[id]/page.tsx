import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerLedger, PAYMENT_STATUS_LABELS } from "@/lib/payments";
import PaymentForm from "@/components/PaymentForm";
import PaymentDeleteButton from "@/components/PaymentDeleteButton";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  PENDING: "bg-red-100 text-red-700",
};

// Finanzas → Cuentas por cobrar → cliente: every sale/order with its payments,
// and a form to register new payments. Settled rows are shown too (faded).
export default async function CustomerReceivablePage({
  params,
}: {
  params: { id: string };
}) {
  const ledger = await getCustomerLedger(params.id);
  if (!ledger) notFound();

  return (
    <div>
      <Link
        href="/admin/finanzas/cobrar"
        className="mb-4 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
      >
        ‹ Volver a cuentas por cobrar
      </Link>

      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          {ledger.customerName}
        </h1>
        <div className="text-right">
          <p className="font-bold uppercase tracking-wide text-[10px] text-muted">
            Saldo pendiente
          </p>
          <p
            className={`font-black text-2xl ${
              ledger.balance > 0 ? "text-red-600" : "text-green-700"
            }`}
          >
            {pesos(ledger.balance)}
          </p>
        </div>
      </div>

      {ledger.sales.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          Este cliente no tiene ventas ni pedidos cargados.
        </p>
      ) : (
        <div className="space-y-3">
          {ledger.sales.map((s) => {
            const settled = s.balance <= 0;
            return (
              <div
                key={`${s.kind}-${s.id}`}
                className={`rounded-lg border bg-white p-4 ${
                  settled ? "border-line opacity-70" : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold uppercase tracking-tight text-ink">
                      {s.kind === "ORDER" ? "Pedido web" : "Venta manual"} ·{" "}
                      {shortDate(s.date)}
                      <span
                        className={`ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          STATUS_STYLES[s.paymentStatus] ?? "bg-cream text-muted"
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[s.paymentStatus] ??
                          s.paymentStatus}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Total {pesos(s.total)} · Pagado {pesos(s.paid)}
                      {s.dueDate && (
                        <> · Vence {shortDate(s.dueDate)}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={`font-black ${
                      settled ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {settled ? "Saldado" : pesos(s.balance)}
                  </span>
                </div>

                {/* Existing payments */}
                {s.payments.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm">
                    {s.payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 text-muted"
                      >
                        <span>
                          {shortDate(p.date)} · {p.methodLabel}
                          {p.notes ? ` · ${p.notes}` : ""}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-green-700">
                            {pesos(p.amount)}
                          </span>
                          <PaymentDeleteButton id={p.id} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {!settled && (
                  <PaymentForm saleId={s.kind === "MANUAL" ? s.id : undefined} orderId={s.kind === "ORDER" ? s.id : undefined} balance={s.balance} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
