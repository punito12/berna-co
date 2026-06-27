import { NextResponse } from "next/server";
import { recordEvent, type TrackInput } from "@/lib/analytics";

// Ingesta de eventos de analytics del ecommerce público. SIN auth (es tráfico
// anónimo del storefront). Diseñada para no fallar nunca de cara al cliente:
// cualquier error se traga y se responde 204 igual, así el tracking jamás
// bloquea la navegación ni el checkout. Acepta un evento o un array (batch).
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: TrackInput[] = Array.isArray(body) ? body : [body];
    // Tope defensivo: ignorar lotes absurdos.
    const slice = events.slice(0, 20);
    await Promise.all(slice.map((e) => recordEvent(e)));
  } catch {
    // Silencioso a propósito: el tracking nunca debe romper el cliente.
  }
  // 204 sin cuerpo: respuesta mínima para sendBeacon/keepalive.
  return new NextResponse(null, { status: 204 });
}
