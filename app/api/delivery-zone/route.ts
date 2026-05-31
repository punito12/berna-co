import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocodeAddress, findZoneByPoint } from "@/lib/zones";

// Resolves a delivery address to coordinates (Nominatim) and checks which zone
// polygon they fall in. Returns that zone's weekdays + slots, or "not covered".
//
// POST /api/delivery-zone { address }
//   -> { covered: true, zoneName, lat, lng, enabledWeekdays, slots }
//    | { covered: false, located: bool }   (located=false → couldn't geocode)

export async function POST(request: Request) {
  let body: { address?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: "Falta la dirección." }, { status: 400 });
  }

  try {
    const geo = await geocodeAddress(address);
    if (!geo) {
      // Couldn't turn the address into coordinates at all.
      return NextResponse.json({ covered: false, located: false });
    }

    const zone = await findZoneByPoint(geo.lat, geo.lng);
    if (!zone) {
      return NextResponse.json({
        covered: false,
        located: true,
        lat: geo.lat,
        lng: geo.lng,
      });
    }

    const slots = await prisma.deliverySlot.findMany({
      where: { available: true },
    });

    return NextResponse.json({
      covered: true,
      zoneName: zone.name,
      lat: geo.lat,
      lng: geo.lng,
      displayName: geo.displayName,
      enabledWeekdays: zone.daysOfWeek,
      slots: slots.map((s) => ({ id: s.id, label: s.label })),
    });
  } catch (error) {
    console.error("delivery-zone error:", error);
    return NextResponse.json(
      { error: "No pudimos verificar tu dirección. Probá de nuevo." },
      { status: 500 }
    );
  }
}
