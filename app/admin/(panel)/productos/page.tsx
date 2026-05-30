import { listProductsForAdmin } from "@/lib/admin";
import ProductEditor from "@/components/ProductEditor";

// Edit price and availability for each product (no create/delete in v1).
export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Productos
      </h1>
      <p className="mb-6 text-sm text-muted">
        Cargá el precio (en pesos) y marcá si está disponible. Los productos
        con precio 0 aparecen como “Precio a confirmar” en el sitio.
      </p>

      <div className="space-y-3">
        {products.map((p) => (
          <ProductEditor
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              price: p.price,
              available: p.available,
            }}
          />
        ))}
      </div>
    </div>
  );
}
