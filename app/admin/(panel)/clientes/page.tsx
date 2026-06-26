import { searchCustomers, listBarrios } from "@/lib/management";
import { findDuplicateGroups, findOrphanRemitoClients } from "@/lib/clients";
import CustomerSearch from "@/components/CustomerSearch";
import DuplicateClients from "@/components/DuplicateClients";
import OrphanRemitoClients from "@/components/OrphanRemitoClients";

export const dynamic = "force-dynamic";

// Customer database with a search box (by name or barrio) + duplicate detection.
export default async function AdminCustomersPage() {
  const [customers, barrios, duplicateGroups, orphans] = await Promise.all([
    searchCustomers(""),
    listBarrios(),
    findDuplicateGroups(),
    findOrphanRemitoClients(),
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

      {orphans.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
            Remitos sin cliente registrado
          </h2>
          <p className="mb-3 text-sm text-muted">
            Estos nombres aparecen en remitos pero no están en el registro de
            clientes. Registralos (mayorista por defecto) para que cuenten como
            cliente y agrupen bien en los reportes.
          </p>
          <OrphanRemitoClients orphans={orphans} />
        </section>
      )}

      {duplicateGroups.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
            Posibles duplicados
          </h2>
          <p className="mb-3 text-sm text-muted">
            Estos clientes parecen el mismo (mismo nombre ignorando
            mayúsculas/acentos/espacios). Elegí cuál mantener y fusionalos: el
            historial se mueve al primario y no se borra ninguna venta ni remito.
          </p>
          <DuplicateClients groups={duplicateGroups} />
        </section>
      )}

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
