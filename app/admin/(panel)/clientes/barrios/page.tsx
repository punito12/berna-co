import { listBarrios } from "@/lib/management";
import BarrioManager from "@/components/BarrioManager";

// Gestión de barrios/localidades para clientes. Los reportes comerciales viven
// solo en Operaciones → Resumen de ventas / Inteligencia Comercial.
export const dynamic = "force-dynamic";

export default async function AdminClientesBarriosPage() {
  const barrios = await listBarrios();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Barrios
      </h1>
      <p className="mb-6 text-sm text-muted">
        Creá y administrá los barrios/localidades que después asignás a cada
        cliente desde su ficha. Los totales de ventas se consultan únicamente en
        Operaciones.
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
