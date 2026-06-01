import { listProductsForAdmin } from "@/lib/admin";
import ProductEditor from "@/components/ProductEditor";
import NewProductButton from "@/components/NewProductButton";
import type { ProductFormValues } from "@/components/ProductForm";

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
// images column is { breadcrumb: string[] }; pass through the photo arrays.
function safeImagesMap(raw: string): Record<string, string[]> {
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, arr] of Object.entries(v)) {
      if (Array.isArray(arr)) {
        out[k] = arr.filter((s): s is string => typeof s === "string");
      }
    }
    return out;
  } catch {
    return {};
  }
}

// Full product management: create, edit every field (incl. photo upload) and
// delete, all from the panel.
export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Productos
        </h1>
        <NewProductButton />
      </div>
      <p className="mb-6 text-sm text-muted">
        Tocá “Editar” en un producto para cambiar nombre, descripción, precio,
        categoría, stock, empanados y foto, o crear uno nuevo. Un empanado con
        precio 0 aparece como “Precio a confirmar”; con stock 0, como “Sin stock”.
      </p>

      <div className="space-y-3">
        {products.map((p) => {
          const value: ProductFormValues = {
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            weightGrams: p.weightGrams,
            costPerKg: p.costPerKg,
            isNew: p.isNew,
            available: p.available,
            breadcrumbs: safeArray(p.availableBreadcrumbs),
            disabledBreadcrumbs: safeArray(p.disabledBreadcrumbs),
            prices: safeNumberMap(p.prices),
            stocks: safeNumberMap(p.stocks),
            images: safeImagesMap(p.images),
          };
          return <ProductEditor key={p.id} product={value} />;
        })}
      </div>
    </div>
  );
}
