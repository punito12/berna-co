import { listZones } from "@/lib/zones";
import ZoneEditor from "@/components/ZoneEditor";
import NewZoneButton from "@/components/NewZoneButton";

// Configuración → Zonas: delivery zones (map polygons + pricing). Moved here
// from the old combined "Entregas" page (Fase 1: navigation only).
export default async function ConfigZonasPage() {
  const zones = await listZones();

  return (
    <div>
      <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
        Zonas
      </h1>
      <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Dibujá en el mapa el área de cada zona y elegí sus días y costo de
          envío. En el checkout, la dirección del cliente se ubica en el mapa y,
          si cae dentro de una zona, se muestran solo esos días.
        </p>
        <NewZoneButton />
      </div>
      {zones.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
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
