// Delivery configuration: which weekdays and time slots are enabled.
// The admin toggles these later (Paso 3); for now they come from the seed.

import { prisma } from "@/lib/db";

export type DeliveryOptions = {
  // Enabled weekdays as numbers: 0=Sun ... 6=Sat.
  enabledWeekdays: number[];
  // Active slots the customer can pick.
  slots: { id: string; label: string }[];
};

export async function getDeliveryOptions(): Promise<DeliveryOptions> {
  const [days, slots] = await Promise.all([
    prisma.availableDeliveryDay.findMany({ where: { available: true } }),
    prisma.deliverySlot.findMany({ where: { available: true } }),
  ]);

  return {
    enabledWeekdays: days.map((d) => d.dayOfWeek),
    slots: slots.map((s) => ({ id: s.id, label: s.label })),
  };
}
