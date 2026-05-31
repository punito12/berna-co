import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  geocodeLocality,
  findZoneByLocality,
  findZoneByLocalities,
  isGeocodingConfigured,
  listZones,
} from "@/lib/zones";

// Resolves a delivery address (or a manually chosen locality) into the zone's
// enabled weekdays + active time slots.
//
// GET  /api/delivery-zone?config=1  -> { geocoding: bool, localities: string[] }
//        (used by the checkout to offer a manual picker when there's no API key)
// POST /api/delivery-zone { address?, locality? }
//        -> { covered: true, zoneName, enabledWeekdays, slots }
//         | { covered: false }            (no zone for that locality)
//         | { needLocality: true, localities }  (couldn't detect; ask manually)

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("config")) {
    const zones = await listZones();
    // The set of localities we serve, for the manual fallback picker.
    const localities = Array.from(
      new Set(zones.filter((z) => z.active).flatMap((z) => z.localities))
    ).sort();
    return NextResponse.json({
      geocoding: isGeocodingConfigured(),
      localities,
    });
  }
  return NextResponse.json({ error: "Parámetro faltante." }, { status: 400 });
}

export async function POST(request: Request) {
  let body: { address?: string; locality?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    // Determine the zone: either from a manually chosen locality, or from the
    // candidate localities geocoding returns for the address.
    let zone = null;
    let detectedLocality: string | null = body.locality?.trim() || null;

    // Helper: the sorted list of localities we serve (for the manual picker).
    const servedLocalities = async () => {
      const zones = await listZones();
      return Array.from(
        new Set(zones.filter((z) => z.active).flatMap((z) => z.localities))
      ).sort();
    };

    if (detectedLocality) {
      // The customer picked a locality by hand: trust it, match it directly.
      zone = await findZoneByLocality(detectedLocality);
      if (!zone) {
        return NextResponse.json({ covered: false });
      }
    } else {
      const address = body.address?.trim();
      if (!address) {
        return NextResponse.json(
          { error: "Falta la dirección." },
          { status: 400 }
        );
      }
      if (!isGeocodingConfigured()) {
        // No API key: ask the customer to pick their locality from our list.
        return NextResponse.json({
          needLocality: true,
          localities: await servedLocalities(),
        });
      }
      const geo = await geocodeLocality(address);
      zone = geo.candidates.length
        ? await findZoneByLocalities(geo.candidates)
        : null;
      detectedLocality = geo.locality;

      // Auto-detection didn't find a zone. Instead of rejecting outright (the
      // address may just be ambiguous), let the customer confirm their locality.
      if (!zone) {
        return NextResponse.json({
          needLocality: true,
          localities: await servedLocalities(),
        });
      }
    }

    const slots = await prisma.deliverySlot.findMany({
      where: { available: true },
    });

    return NextResponse.json({
      covered: true,
      zoneName: zone.name,
      detectedLocality,
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
