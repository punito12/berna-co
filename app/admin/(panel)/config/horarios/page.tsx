import { getDeliveryConfig } from "@/lib/admin";
import DeliveryToggle from "@/components/DeliveryToggle";

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// Configuración → Días y horarios: global weekday/slot toggles. Moved here from
// the old combined "Entregas" page (Fase 1: navigation only).
export default async function ConfigHorariosPage() {
  const { days, slots } = await getDeliveryConfig();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Días y horarios
      </h1>
      <p className="mb-6 text-sm text-muted">
        Días y franjas horarias disponibles para entregas y retiros.
      </p>

      <div className="space-y-8">
        <div>
          <h2 className="mb-3 font-bold uppercase tracking-wide text-sm text-muted">
            Días de la semana
          </h2>
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
          <h2 className="mb-3 font-bold uppercase tracking-wide text-sm text-muted">
            Horarios
          </h2>
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
    </div>
  );
}
