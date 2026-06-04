import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setProductCost } from "@/lib/pricing";

// Set the cost for one (product, empanado). Admin-only.
// POST { productId, breadcrumbType, cost }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { productId?: string; breadcrumbType?: string; cost?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.productId || !body.breadcrumbType)
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  try {
    await setProductCost(body.productId, body.breadcrumbType, Number(body.cost));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
