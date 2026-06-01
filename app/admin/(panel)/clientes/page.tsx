import { listCustomers, listNeighborhoods } from "@/lib/management";
import CustomerRow from "@/components/CustomerRow";
import NewCustomerButton from "@/components/NewCustomerButton";

// Customer database: create, edit, delete clients for manual sales.
export default async function AdminCustomersPage() {
  const [customers, neighborhoods] = await Promise.all([
    listCustomers(),
    listNeighborhoods(),
  ]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Clientes
        </h1>
        <NewCustomerButton neighborhoods={neighborhoods} />
      </div>
      <p className="mb-6 text-sm text-muted">
        Tu base de clientes para las ventas manuales. El tipo define el
        descuento sugerido (Minorista 10%, Mayorista 25%, Kiosco 30%), que
        siempre podés ajustar por cliente o por venta. Cargá barrio y lote para
        ver la facturación por barrio.
      </p>

      {customers.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-12 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay clientes. Creá el primero arriba.
        </p>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <CustomerRow
              key={c.id}
              neighborhoods={neighborhoods}
              customer={{
                id: c.id,
                name: c.name,
                type: c.type,
                defaultDiscount: c.defaultDiscount,
                phone: c.phone ?? "",
                notes: c.notes ?? "",
                neighborhood: c.neighborhood ?? "",
                lot: c.lot ?? "",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
