import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createProduct, type ProductInput } from "@/lib/admin";

// Creates a new product. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: ProductInput;
  try {
    body = (await request.json()) as ProductInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await createProduct(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear." },
      { status: 400 }
    );
  }
}
