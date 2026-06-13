import { NextResponse } from "next/server";
import { getDeliveryOptions, normalizeScheduleType } from "@/lib/delivery";

export const dynamic = "force-dynamic";

// Returns the enabled weekdays and active time slots for the date picker.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleType = normalizeScheduleType(searchParams.get("type"));
    const options = await getDeliveryOptions(scheduleType);
    return NextResponse.json(options);
  } catch (error) {
    console.error("delivery-options error:", error);
    return NextResponse.json(
      { error: "No pudimos cargar los días de entrega. Probá de nuevo." },
      { status: 500 }
    );
  }
}
