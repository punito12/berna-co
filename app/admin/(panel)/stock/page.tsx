import { getStockOverview } from "@/lib/admin";
import { BREADCRUMB_LABELS } from "@/lib/products";

const LOW_STOCK = 3; // highlight stock at or below this

// Stock → Inventario actual: read-only stock per product and empanado. In a
// later phase, stock changes happen via Ajustes and Producción (not by editing
// the number directly). Low stock is highlighted in red.
export default async function InventarioPage() {
  const stock = await getStockOverview();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Inventario actual
      </h1>
      <p className="mb-6 text-sm text-muted">
        Stock por empanado (solo lectura). Los ajustes y la producción se cargan
        en <span className="font-bold text-ink">Stock → Producción</span> y{" "}
        <span className="font-bold text-ink">Movimientos</span>.
      </p>

      <div className="space-y-3">
        {stock.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-line bg-white px-4 py-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-black uppercase tracking-tight text-ink">
                {p.name}
              </h2>
              {!p.available && (
                <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Pausado
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {p.breadcrumbs.length === 0 ? (
                <span className="text-sm text-muted">Sin empanados.</span>
              ) : (
                p.breadcrumbs.map((b) => {
                  const low = b.stock <= LOW_STOCK;
                  return (
                    <span
                      key={b.code}
                      className={`rounded-md border px-3 py-1.5 text-sm font-bold ${
                        low
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-line bg-cream/40 text-ink"
                      }`}
                    >
                      {BREADCRUMB_LABELS[b.code] ?? b.code}:{" "}
                      <span className="tabular-nums">{b.stock}</span>
                    </span>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
