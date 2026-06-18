import { getStockOverview } from "@/lib/admin";
import { STOCK_TABS } from "@/lib/stock-ops";
import SubTabs from "@/components/SubTabs";
import StockTable, { type StockRow } from "@/components/StockTable";

// Stock → Inventario (V2): una tabla por producto + empanado/variedad, con
// filtros (buscar, empanado, estado, categoría) y ajuste por fila. El stock real
// se muta SIEMPRE vía /api/admin/stock/adjustment (registra el movimiento con
// motivo); acá solo se muestra y se dispara ese ajuste. No se cambió la lógica
// de mutación de stock.
export default async function InventarioPage() {
  const overview = await getStockOverview();

  // Aplanar a filas producto + empanado (cada variante es su propia unidad).
  const rows: StockRow[] = overview.flatMap((p) =>
    p.breadcrumbs.map((b) => ({
      productId: p.id,
      productName: p.name,
      category: p.category,
      available: p.available,
      breadcrumb: b.code,
      stock: b.stock,
    }))
  );

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
        Stock por producto y empanado. Para corregir el stock, usá{" "}
        <span className="font-bold text-ink">Ajustar</span> en cada fila (queda
        registrado el motivo en Movimientos).
      </p>

      <StockTable rows={rows} />
    </div>
  );
}
