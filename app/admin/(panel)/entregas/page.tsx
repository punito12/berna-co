import Link from "next/link";
import { listOrders } from "@/lib/admin";
import { deliveryTypeLabel } from "@/lib/format";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd, local
}

// Operaciones → Entregas: the day's deliveries grouped by zone/barrio so the
// repartidor can plan the route. Read-only view over existing orders (Fase 1).
export default async function EntregasPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date || todayStr();
  const orders = await listOrders({ date });

  // Only scheduled (non-cancelled) orders; split delivery vs pickup.
  const active = orders.filter((o) => o.status !== "CANCELLED");
  const deliveries = active.filter((o) => o.deliveryType === "DELIVERY");
  const pickups = active.filter((o) => o.deliveryType === "PICKUP");

  // Group deliveries by barrio (fallback to "Sin barrio").
  const byZone = new Map<string, typeof deliveries>();
  for (const o of deliveries) {
    const zone = o.customer?.barrio?.name ?? "Sin barrio asignado";
    if (!byZone.has(zone)) byZone.set(zone, []);
    byZone.get(zone)!.push(o);
  }
  const zones = [...byZone.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const niceDate = new Date(`${date}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
        Entregas
      </h1>
      <p className="mb-4 mt-1 text-sm capitalize text-muted">{niceDate}</p>

      {/* Day picker */}
      <form method="get" className="mb-6 flex items-end gap-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Ver día
          </span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white"
        >
          Ver
        </button>
      </form>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Entregas" value={String(deliveries.length)} />
        <Stat label="Retiros" value={String(pickups.length)} />
        <Stat
          label="Total del día"
          value={pesos(active.reduce((s, o) => s + o.total, 0))}
          strong
        />
      </div>

      {active.length === 0 && (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          No hay pedidos para este día.
        </p>
      )}

      {/* Deliveries by zone */}
      {zones.map(([zone, list]) => (
        <section key={zone} className="mb-8">
          <h2 className="mb-3 flex items-baseline gap-2 font-black uppercase tracking-tight text-xl text-ink">
            {zone}
            <span className="text-sm font-bold text-muted">
              ({list.length})
            </span>
          </h2>
          <div className="space-y-2">
            {list.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        </section>
      ))}

      {/* Pickups */}
      {pickups.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-baseline gap-2 font-black uppercase tracking-tight text-xl text-ink">
            Retiros en local
            <span className="text-sm font-bold text-muted">
              ({pickups.length})
            </span>
          </h2>
          <div className="space-y-2">
            {pickups.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderRow({
  order,
}: {
  order: Awaited<ReturnType<typeof listOrders>>[number];
}) {
  return (
    <Link
      href={`/admin/pedidos?focus=${order.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 transition-colors hover:border-black"
    >
      <div className="min-w-0">
        <p className="font-bold uppercase tracking-tight text-ink">
          {order.scheduledSlot} · {order.customerName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {order.deliveryType === "DELIVERY"
            ? order.address || "Sin dirección"
            : deliveryTypeLabel(order.deliveryType)}{" "}
          · {order.customerPhone}
        </p>
      </div>
      <span className="font-black text-ink">{pesos(order.total)}</span>
    </Link>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        strong ? "border-black bg-ink text-white" : "border-line bg-white"
      }`}
    >
      <p
        className={`font-bold uppercase tracking-wide text-[10px] ${
          strong ? "text-cream" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 font-black text-xl">{value}</p>
    </div>
  );
}
