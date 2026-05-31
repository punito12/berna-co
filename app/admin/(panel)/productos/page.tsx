import { listProductsForAdmin } from "@/lib/admin";
import ProductEditor from "@/components/ProductEditor";

// Helpers to parse the JSON columns coming from the database row.
function safeArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function safeNumberMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

// Edit price + stock (per empanado) and availability for each product
// (no create/delete in v1).
export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Productos
      </h1>
      <p className="mb-6 text-sm text-muted">
        Cargá el precio y el stock de cada empanado, y marcá si está disponible.
        Un empanado con precio 0 aparece como “Precio a confirmar”; con stock 0,
        como “Sin stock”.
      </p>

      <div className="space-y-3">
        {products.map((p) => (
          <ProductEditor
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              available: p.available,
              breadcrumbs: safeArray(p.availableBreadcrumbs),
              prices: safeNumberMap(p.prices),
              stocks: safeNumberMap(p.stocks),
            }}
          />
        ))}
      </div>
    </div>
  );
}
