import { listZones } from "@/lib/zones";
import ZoneEditor from "@/components/ZoneEditor";
import NewZoneButton from "@/components/NewZoneButton";

// Manage delivery zones: create, add localities, set weekdays.
export default async function AdminZonesPage() {
  const zones = await listZones();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Zonas de entrega
      </h1>
      <p className="mb-6 text-sm text-muted">
        Creá zonas, agregales las localidades que las componen y elegí qué días
        entregás en cada una. En el checkout, la dirección del cliente se asocia
        a una zona y solo se muestran esos días.
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
