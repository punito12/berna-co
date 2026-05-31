import { listZones } from "@/lib/zones";
import ZoneEditor from "@/components/ZoneEditor";
import NewZoneButton from "@/components/NewZoneButton";

// Manage delivery zones: create, draw a coverage polygon, set weekdays.
export default async function AdminZonesPage() {
  const zones = await listZones();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Zonas de entrega
      </h1>
      <p className="mb-6 text-sm text-muted">
        Creá zonas, dibujá en el mapa el área de cobertura de cada una y elegí
        qué días entregás. En el checkout, la dirección del cliente se ubica en
        el mapa y, si cae dentro de una zona, se muestran solo esos días.
      </p>

      <div className="mb-6">
        <NewZoneButton />
      </div>

      {zones.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-12 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay zonas. Creá la primera arriba.
        </p>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <ZoneEditor key={zone.id} zone={zone} />
          ))}
        </div>
      )}
    </div>
  );
}
