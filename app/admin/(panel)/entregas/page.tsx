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

// Enable/disable delivery weekdays and time slots.
export default async function AdminDeliveryPage() {
  const { days, slots } = await getDeliveryConfig();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
          Entregas
        </h1>
        <p className="text-sm text-muted">
          Elegí en qué días y horarios hacés entregas. El cliente solo puede
          elegir los que estén activos.
        </p>
      </div>

      <section>
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
      </section>

      <section>
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
      </section>
    </div>
  );
}
