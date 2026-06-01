import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createCustomer, type CustomerInput } from "@/lib/management";

// Creates a customer. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: CustomerInput;
  try {
    body = (await request.json()) as CustomerInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await createCustomer(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear." },
      { status: 400 }
    );
  }
}
