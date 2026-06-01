import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createManualSale, type SaleInput } from "@/lib/management";

// Creates a manual sale. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: SaleInput;
  try {
    body = (await request.json()) as SaleInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await createManualSale(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
