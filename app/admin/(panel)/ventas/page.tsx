import {
  listProductsForSale,
  listManualSales,
  listBarrios,
} from "@/lib/management";
import SaleForm from "@/components/SaleForm";
import SaleRow from "@/components/SaleRow";

// Load a manual sale (not from the web) + recent sales list.
export default async function AdminSalesPage() {
  const [products, sales, barrios] = await Promise.all([
    listProductsForSale(),
    listManualSales(50),
    listBarrios(),
  ]);

  const dateFmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Cargar venta
      </h1>
      <p className="mb-6 text-sm text-muted">
        Registrá una venta que no vino de la web (WhatsApp, mayorista, kiosco).
        El precio se autocompleta con el del producto pero podés editarlo.
      </p>

      <SaleForm
        products={products}
        barrios={barrios.map((b) => ({ id: b.id, name: b.name }))}
      />

      <h2 className="mb-3 mt-10 font-black uppercase tracking-tight text-xl text-ink">
        Ventas recientes
      </h2>
      {sales.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no cargaste ventas.
        </p>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <SaleRow
              key={s.id}
              sale={{
                id: s.id,
                soldAt: dateFmt.format(s.soldAt),
                channel: s.channel,
                customerName: s.customerName,
                itemsCount: s.items.length,
                gross: s.gross,
                discountAmount: s.discountAmount,
                net: s.net,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
