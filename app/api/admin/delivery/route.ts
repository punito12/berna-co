import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setDayAvailability, setSlotAvailability } from "@/lib/admin";

// Toggles a delivery day or slot on/off. Admin-only.
// Body: { kind: "day" | "slot", id: string, available: boolean }
export async function PATCH(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: { kind?: string; id?: string; available?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (!body.id || (body.kind !== "day" && body.kind !== "slot")) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    if (body.kind === "day") {
      await setDayAvailability(body.id, Boolean(body.available));
    } else {
      await setSlotAvailability(body.id, Boolean(body.available));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}
