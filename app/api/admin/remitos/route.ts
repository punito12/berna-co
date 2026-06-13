import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createRemito, type RemitoInput } from "@/lib/remitos";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: RemitoInput;
  try {
    body = (await request.json()) as RemitoInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const remito = await createRemito(body);
    return NextResponse.json({ ok: true, id: remito.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear el remito." },
      { status: 400 }
    );
  }
}
