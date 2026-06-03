import Link from "next/link";
import { listProductsForSale, listBarrios } from "@/lib/management";
import SaleForm from "@/components/SaleForm";
import SubTabs from "@/components/SubTabs";

const VENTAS_TABS = [
  { href: "/admin/ventas", label: "Cargar venta" },
  { href: "/admin/ventas/promociones", label: "Promociones" },
];

// Cargar venta manual (WhatsApp / mayorista / kiosco). The list of sales now
// lives in the unified "Pedidos y ventas" view.
export default async function AdminSalesPage() {
  const [products, barrios] = await Promise.all([
    listProductsForSale(),
    listBarrios(),
  ]);

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Ventas
      </h1>
      <SubTabs tabs={VENTAS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Cargar venta
      </h2>
      <p className="mb-6 text-sm text-muted">
        Registrá una venta que no vino de la web (WhatsApp, mayorista, kiosco).
        El precio se autocompleta con el del producto pero podés editarlo. Las
        ventas cargadas aparecen en{" "}
        <Link
          href="/admin/operaciones/ventas"
          className="font-bold text-ink underline"
        >
          Pedidos y ventas
        </Link>
        .
      </p>

      <SaleForm
        products={products}
        barrios={barrios.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
