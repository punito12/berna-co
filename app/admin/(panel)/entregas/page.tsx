import { getDeliveryConfig } from "@/lib/admin";
import { listZones } from "@/lib/zones";
import DeliveryToggle from "@/components/DeliveryToggle";
import ZoneEditor from "@/components/ZoneEditor";
import NewZoneButton from "@/components/NewZoneButton";

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// Entregas: delivery zones (map polygons + pricing) and the global weekday/slot
// toggles, unified in one page.
export default async function AdminDeliveryPage() {
  const [{ days, slots }, zones] = await Promise.all([
    getDeliveryConfig(),
    listZones(),
  ]);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Entregas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Zonas de cobertura, días y horarios de entrega.
        </p>
      </div>

      {/* Zones */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">
            Zonas de cobertura
          </h2>
          <NewZoneButton />
        </div>
        <p className="mb-4 text-sm text-muted">
          Dibujá en el mapa el área de cada zona y elegí sus días y costo de
          envío. En el checkout, la dirección del cliente se ubica en el mapa y,
          si cae dentro de una zona, se muestran solo esos días.
        </p>
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
      </section>

      {/* Global weekdays + slots (used by pick-up / fallback) */}
      <section>
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Días y horarios
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-bold uppercase tracking-wide text-sm text-muted">
              Días de la semana
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {days.map((day) => (
                <DeliveryToggle
                  key={day.id}
                  kind="day"
                  id={day.id}
                  label={WEEKDAY_NAMES[day.dayOfWeek] ?? `Día ${day.dayOfWeek}`}
                  initial={day.available}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-bold uppercase tracking-wide text-sm text-muted">
              Horarios
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {slots.map((slot) => (
                <DeliveryToggle
                  key={slot.id}
                  kind="slot"
                  id={slot.id}
                  label={slot.label}
                  initial={slot.available}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
