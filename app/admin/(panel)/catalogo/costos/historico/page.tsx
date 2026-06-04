import { COSTOS_TABS } from "@/lib/pricing";
import {
  getPriceHistory,
  listProductBreadcrumbs,
} from "@/lib/pricing-history";
import SubTabs from "@/components/SubTabs";
import HistorySelector from "@/components/HistorySelector";
import PriceHistoryChart from "@/components/PriceHistoryChart";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Catálogo → Costos y Precios (Tab 5): cost/price history chart + change log.
export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: { product?: string; bc?: string; from?: string; to?: string };
}) {
  const products = await listProductBreadcrumbs();

  // Default to the first product+empanado if none chosen.
  const productId = searchParams.product || products[0]?.id || "";
  const selectedProduct = products.find((p) => p.id === productId);
  const breadcrumbType =
    searchParams.bc || selectedProduct?.breadcrumbs[0] || "";

  const from = searchParams.from
    ? new Date(`${searchParams.from}T00:00:00`)
    : undefined;
  const to = searchParams.to
    ? (() => {
        const d = new Date(`${searchParams.to}T00:00:00`);
        d.setDate(d.getDate() + 1);
        return d;
      })()
    : undefined;

  const { points, changes } =
    productId && breadcrumbType
      ? await getPriceHistory(productId, breadcrumbType, from, to)
      : { points: [], changes: [] };

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Histórico
      </h2>

      <HistorySelector
        products={products}
        productId={productId}
        breadcrumbType={breadcrumbType}
        from={searchParams.from ?? ""}
        to={searchParams.to ?? ""}
      />

      <PriceHistoryChart points={points} />

      {/* Change log */}
      <h3 className="mb-3 mt-8 font-black uppercase tracking-tight text-lg text-ink">
        Cambios
      </h3>
      {changes.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-muted">
          Sin cambios en el período.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Fecha", "Qué cambió", "Valor anterior", "Valor nuevo"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {changes.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-muted">
                    {c.changedAt.toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 text-ink">{c.field}</td>
                  <td className="px-3 py-2 text-muted">
                    {c.previous !== null ? pesos(c.previous) : "—"}
                  </td>
                  <td className="px-3 py-2 font-bold text-ink">
                    {pesos(c.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
