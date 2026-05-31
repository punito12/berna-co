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
function safePrices(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

// Edit price (per empanado) and availability for each product (no create/delete in v1).
export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Productos
      </h1>
      <p className="mb-6 text-sm text-muted">
        Cargá el precio de cada empanado (en pesos) y marcá si está disponible.
        Un empanado con precio 0 aparece como “Precio a confirmar” en el sitio.
      </p>

      <div className="space-y-3">
        {products.map((p) => (
          <ProductEditor
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              available: p.available,
              stock: p.stock,
              breadcrumbs: safeArray(p.availableBreadcrumbs),
              prices: safePrices(p.prices),
            }}
          />
        ))}
      </div>
    </div>
  );
}
