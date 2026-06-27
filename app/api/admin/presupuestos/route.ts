import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPresupuesto, type PresupuestoInput } from "@/lib/presupuestos";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: PresupuestoInput;
  try {
    body = (await request.json()) as PresupuestoInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const p = await createPresupuesto(body);
    return NextResponse.json({ ok: true, id: p.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear el presupuesto." },
      { status: 400 }
    );
  }
}
