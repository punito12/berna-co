import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplier } from "@/lib/suppliers";
import { getSupplierPurchases, PURCHASE_STATUS_LABELS } from "@/lib/purchases";
import SupplierPaymentForm from "@/components/SupplierPaymentForm";
import SupplierPaymentDeleteButton from "@/components/SupplierPaymentDeleteButton";

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

// Finanzas → Cuentas por pagar → proveedor: every purchase with its payments,
// and a form to register payments. Settled purchases are shown faded.
export default async function SupplierPayablePage({
  params,
}: {
  params: { id: string };
}) {
  const [supplier, purchases] = await Promise.all([
    getSupplier(params.id),
    getSupplierPurchases(params.id),
  ]);
  if (!supplier) notFound();

  const balance = purchases.reduce((a, p) => a + Math.max(0, p.balance), 0);

  return (
    <div>
      <Link
        href="/admin/finanzas/pagar"
        className="mb-4 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
      >
        ‹ Volver a cuentas por pagar
      </Link>

      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          {supplier.name}
        </h1>
        <div className="text-right">
          <p className="font-bold uppercase tracking-wide text-[10px] text-muted">
            Saldo pendiente
          </p>
          <p
            className={`font-black text-2xl ${
              balance > 0 ? "text-red-600" : "text-green-700"
            }`}
          >
            {pesos(balance)}
          </p>
        </div>
      </div>

      {purchases.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          Este proveedor no tiene compras cargadas.
        </p>
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => {
            const settled = p.balance <= 0;
            return (
              <div
                key={p.id}
                className={`rounded-lg border bg-white p-4 ${
                  settled ? "border-line opacity-70" : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold uppercase tracking-tight text-ink">
                      Compra · {shortDate(p.date)}
                      <span
                        className={`ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          STATUS_STYLES[p.paymentStatus] ?? "bg-cream text-muted"
                        }`}
                      >
                        {PURCHASE_STATUS_LABELS[p.paymentStatus] ??
                          p.paymentStatus}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Total {pesos(p.total)} · Pagado {pesos(p.paid)}
                      {p.dueDate && <> · Vence {shortDate(p.dueDate)}</>}
                    </p>
                  </div>
                  <span
                    className={`font-black ${
                      settled ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {settled ? "Pagada" : pesos(p.balance)}
                  </span>
                </div>

                {p.payments.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-line pt-2 text-sm">
                    {p.payments.map((pay) => (
                      <li
                        key={pay.id}
                        className="flex items-center justify-between gap-2 text-muted"
                      >
                        <span>
                          {shortDate(pay.date)} · {pay.methodLabel}
                          {pay.notes ? ` · ${pay.notes}` : ""}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-red-600">
                            − {pesos(pay.amount)}
                          </span>
                          <SupplierPaymentDeleteButton id={pay.id} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {!settled && (
                  <SupplierPaymentForm
                    purchaseId={p.id}
                    balance={p.balance}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
