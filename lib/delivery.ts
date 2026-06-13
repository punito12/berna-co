// Delivery configuration: which weekdays and time slots are enabled.
// The admin toggles these later (Paso 3); for now they come from the seed.

import { prisma } from "@/lib/db";

export type ScheduleType = "DELIVERY" | "PICKUP";

export type DeliveryOptions = {
  // Enabled weekdays as numbers: 0=Sun ... 6=Sat.
  enabledWeekdays: number[];
  // Active slots the customer can pick.
  slots: { id: string; label: string }[];
};

export function normalizeScheduleType(value: unknown): ScheduleType {
  return value === "PICKUP" ? "PICKUP" : "DELIVERY";
}

export async function getDeliveryOptions(
  scheduleType: ScheduleType = "DELIVERY"
): Promise<DeliveryOptions> {
  const [days, slots] = await Promise.all([
    prisma.availableDeliveryDay.findMany({
      where: { available: true, scheduleType },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.deliverySlot.findMany({
      where: { available: true, scheduleType },
      orderBy: { label: "asc" },
    }),
  ]);

  return {
    enabledWeekdays: days.map((d) => d.dayOfWeek),
    slots: slots.map((s) => ({ id: s.id, label: s.label })),
  };
}
