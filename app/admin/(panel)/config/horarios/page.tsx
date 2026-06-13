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
  const config = await getDeliveryConfig();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Días y horarios
      </h1>
      <p className="mb-6 text-sm text-muted">
        Días y franjas horarias disponibles para envío a domicilio y para pasar
        a retirar. Cada agenda se configura por separado.
      </p>

      <div className="space-y-8">
        <SchedulePanel
          title="Envío a domicilio"
          days={config.delivery.days}
          slots={config.delivery.slots}
        />
        <SchedulePanel
          title="Pasar a retirar"
          days={config.pickup.days}
          slots={config.pickup.slots}
        />
      </div>
    </div>
  );
}

function SchedulePanel({
  title,
  days,
  slots,
}: {
  title: string;
  days: { id: string; dayOfWeek: number; available: boolean }[];
  slots: { id: string; label: string; available: boolean }[];
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h2 className="font-black uppercase tracking-tight text-xl text-ink">
        {title}
      </h2>

      <div className="mt-5">
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

      <div className="mt-5">
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
    </section>
  );
}
