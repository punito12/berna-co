import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findZoneByPostalCode, normalizePostalCode } from "@/lib/zones";

// Checks whether a postal code is within a delivery zone, and if so returns
// that zone's enabled weekdays + active time slots. This is the coverage
// "barrier": the customer enters their postal code first; only when it's
// covered does the checkout ask for the full address.
//
// POST /api/delivery-zone { postalCode }
//   -> { covered: true, zoneName, postalCode, enabledWeekdays, slots }
//    | { covered: false }
//    | { invalid: true }   (couldn't read a 4-digit code)

export async function POST(request: Request) {
  let body: { postalCode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const code = normalizePostalCode(body.postalCode ?? "");
  if (!code) {
    return NextResponse.json({ invalid: true });
  }

  try {
    const zone = await findZoneByPostalCode(code);
    if (!zone) {
      return NextResponse.json({ covered: false });
    }

    const slots = await prisma.deliverySlot.findMany({
      where: { available: true },
    });

    return NextResponse.json({
      covered: true,
      zoneName: zone.name,
      postalCode: code,
      enabledWeekdays: zone.daysOfWeek,
      slots: slots.map((s) => ({ id: s.id, label: s.label })),
    });
  } catch (error) {
    console.error("delivery-zone error:", error);
    return NextResponse.json(
      { error: "No pudimos verificar tu zona. Probá de nuevo." },
      { status: 500 }
    );
  }
}
