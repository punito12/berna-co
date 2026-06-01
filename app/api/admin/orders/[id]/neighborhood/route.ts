import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setOrderNeighborhood } from "@/lib/management";

// Assigns/clears the neighborhood of a web order. Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { neighborhood?: string };
  try {
    body = (await request.json()) as { neighborhood?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await setOrderNeighborhood(params.id, body.neighborhood ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
