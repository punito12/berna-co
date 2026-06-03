import { getStockOverview } from "@/lib/admin";
import { BREADCRUMB_LABELS } from "@/lib/products";
import { STOCK_TABS } from "@/lib/stock-ops";
import SubTabs from "@/components/SubTabs";
import AdjustStockButton from "@/components/AdjustStockButton";

const LOW_STOCK = 3; // highlight stock at or below this

// Stock → Inventario: stock per product and empanado. Numbers aren't edited
// directly — changes go through Ajustes (here, with a reason) and Producción.
// Low stock is highlighted in red.
export default async function InventarioPage() {
  const stock = await getStockOverview();

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Stock
      </h1>
      <SubTabs tabs={STOCK_TABS} />
      <h2 className="mb-1 font-black uppercase tracking-tight text-xl text-ink">
        Inventario actual
      </h2>
      <p className="mb-6 text-sm text-muted">
        Stock por empanado. Para sumar usá{" "}
        <span className="font-bold text-ink">Producción</span>; para corregir,{" "}
        <span className="font-bold text-ink">Ajustar</span> (queda registrado el
        motivo en Movimientos).
      </p>

      <div className="space-y-3">
        {stock.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-line bg-white px-4 py-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-black uppercase tracking-tight text-ink">
                {p.name}
              </h3>
              {!p.available && (
                <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Pausado
                </span>
              )}
            </div>
            {p.breadcrumbs.length === 0 ? (
              <span className="text-sm text-muted">Sin empanados.</span>
            ) : (
              <div className="space-y-2">
                {p.breadcrumbs.map((b) => {
                  const low = b.stock <= LOW_STOCK;
                  return (
                    <div
                      key={b.code}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <span
                        className={`rounded-md border px-3 py-1.5 text-sm font-bold ${
                          low
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-line bg-cream/40 text-ink"
                        }`}
                      >
                        {BREADCRUMB_LABELS[b.code] ?? b.code}:{" "}
                        <span className="tabular-nums">{b.stock}</span>
                      </span>
                      <AdjustStockButton
                        productId={p.id}
                        breadcrumbType={b.code}
                        currentStock={b.stock}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
