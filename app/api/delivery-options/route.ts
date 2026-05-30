import { NextResponse } from "next/server";
import { getDeliveryOptions } from "@/lib/delivery";

// Returns the enabled weekdays and active time slots for the date picker.
export async function GET() {
  try {
    const options = await getDeliveryOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.error("delivery-options error:", error);
    return NextResponse.json(
      { error: "No pudimos cargar los días de entrega. Probá de nuevo." },
      { status: 500 }
    );
  }
}
