import { NextResponse } from "next/server";
import { getPublicDeliveryConfig } from "@/lib/delivery-config";

// Config de entrega para el checkout (modo + localidades habilitadas + dirección
// de retiro). Pública, solo lectura.
export async function GET() {
  try {
    const config = await getPublicDeliveryConfig();
    return NextResponse.json(config);
  } catch {
    // Fallback seguro: modo mapa (comportamiento actual) si algo falla.
    return NextResponse.json({
      mode: "map",
      pickupAddress: "Aristóbulo del Valle 5155, Benavídez",
      localities: [],
    });
  }
}
