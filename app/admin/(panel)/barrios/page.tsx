import { listBarrios } from "@/lib/management";
import BarrioManager from "@/components/BarrioManager";

// Barrios section: create barrios and open each one to see its data.
export default async function AdminBarriosPage() {
  const barrios = await listBarrios();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Barrios
      </h1>
      <p className="mb-6 text-sm text-muted">
        Creá los barrios donde entregás. Después los asignás a cada cliente desde
        su ficha. Entrá a un barrio para ver sus clientes, pedidos, kg y
        facturación.
      </p>

      <BarrioManager
        barrios={barrios.map((b) => ({
          id: b.id,
          name: b.name,
          customers: b._count.customers,
        }))}
      />
    </div>
  );
}
