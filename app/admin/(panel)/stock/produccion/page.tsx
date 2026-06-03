import {
  listProductsWithBreadcrumbs,
  listStockMovements,
  STOCK_TABS,
} from "@/lib/stock-ops";
import { BREADCRUMB_LABELS } from "@/lib/products";
import ProductionForm from "@/components/ProductionForm";
import SubTabs from "@/components/SubTabs";

function shortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

// Stock → Producción: load produced units (adds stock + a PRODUCTION movement).
export default async function ProduccionPage() {
  const [products, recent] = await Promise.all([
    listProductsWithBreadcrumbs(),
    listStockMovements({ type: "PRODUCTION", limit: 20 }),
  ]);

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Stock
      </h1>
      <SubTabs tabs={STOCK_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Cargar producción
      </h2>
      <p className="mb-5 text-sm text-muted">
        Sumá lo producido por producto y empanado. Genera un movimiento de stock
        de tipo Producción y actualiza el inventario.
      </p>

      <ProductionForm products={products} />

      <h2 className="mb-3 mt-10 font-black uppercase tracking-tight text-xl text-ink">
        Producciones recientes
      </h2>
      {recent.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-muted">
          Todavía no cargaste producción.
        </p>
      ) : (
        <div className="space-y-2">
          {recent.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3"
            >
              <div>
                <p className="font-bold uppercase tracking-tight text-sm text-ink">
                  {m.productName}{" "}
                  <span className="text-muted">
                    · {BREADCRUMB_LABELS[m.breadcrumbType] ?? m.breadcrumbType}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {shortDate(m.date)}
                  {m.notes ? ` · ${m.notes}` : ""}
                </p>
              </div>
              <span className="font-black text-green-700">+{m.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
