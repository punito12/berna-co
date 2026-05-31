import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createZone } from "@/lib/admin";

// Creates a new (empty) zone. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await createZone(body.name ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear." },
      { status: 400 }
    );
  }
}
