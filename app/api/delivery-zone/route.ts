import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocodeStructured, findZoneByPoint } from "@/lib/zones";

// Resolves a STRUCTURED delivery address to coordinates (Nominatim) and checks
// which zone polygon they fall in. Splitting the address into street/locality/
// postalCode lets the geocoder disambiguate streets that exist in many cities.
//
// POST /api/delivery-zone { street, locality, postalCode? }
//   -> { covered: true, zoneName, lat, lng, enabledWeekdays, slots }
//    | { covered: false, located: bool }   (located=false → couldn't geocode)

export async function POST(request: Request) {
  let body: { street?: string; locality?: string; postalCode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const street = body.street?.trim();
  const locality = body.locality?.trim();
  if (!street) {
    return NextResponse.json(
      { error: "Falta la calle y número." },
      { status: 400 }
    );
  }
  if (!locality) {
    return NextResponse.json(
      { error: "Falta la localidad." },
      { status: 400 }
    );
  }

  try {
    const geo = await geocodeStructured({
      street,
      locality,
      postalCode: body.postalCode,
    });
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
      // Delivery pricing for this zone (the checkout shows it and adds it).
      shippingCost: zone.shippingCost,
      freeShippingFrom: zone.freeShippingFrom,
    });
  } catch (error) {
    console.error("delivery-zone error:", error);
    return NextResponse.json(
      { error: "No pudimos verificar tu dirección. Probá de nuevo." },
      { status: 500 }
    );
  }
}
