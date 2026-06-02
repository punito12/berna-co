import { searchCustomers, listBarrios } from "@/lib/management";
import CustomerSearch from "@/components/CustomerSearch";

// Customer database with a search box (by name or barrio).
export default async function AdminCustomersPage() {
  const [customers, barrios] = await Promise.all([
    searchCustomers(""),
    listBarrios(),
  ]);

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Clientes
      </h1>
      <p className="mb-6 text-sm text-muted">
        Buscá por nombre o barrio y entrá a la ficha de cada cliente para ver su
        historial. Los pedidos web crean (o reusan) su cliente automáticamente.
      </p>

      <CustomerSearch
        barrios={barrios.map((b) => ({ id: b.id, name: b.name }))}
        initial={customers.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          barrio: c.barrio?.name ?? null,
          phone: c.phone,
          orders: c._count.orders + c._count.sales,
        }))}
      />
    </div>
  );
}
