import { NextResponse } from "next/server";
import { getPublicDeliveryConfig } from "@/lib/delivery-config";

// SIEMPRE dinámico: el checkout debe leer la config de entrega fresca de la DB.
// Sin esto, en producción (Vercel) esta GET se cacheaba estáticamente y el
// checkout seguía mostrando los horarios viejos aunque el admin los cambiara
// (en local/dev no se nota porque no hay caché de CDN).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Config de entrega para el checkout (modo + localidades habilitadas + dirección
// de retiro). Pública, solo lectura.
const NO_CACHE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET() {
  try {
    const config = await getPublicDeliveryConfig();
    return NextResponse.json(config, { headers: NO_CACHE });
  } catch {
    // Fallback seguro: modo mapa (comportamiento actual) si algo falla.
    return NextResponse.json(
      {
        mode: "map",
        pickupAddress: "Aristóbulo del Valle 5155, Benavídez",
        localities: [],
      },
      { headers: NO_CACHE }
    );
  }
}
