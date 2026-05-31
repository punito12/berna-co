import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateProduct } from "@/lib/admin";

// Updates a product's price and availability. Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    prices?: Record<string, number>;
    stocks?: Record<string, number>;
    available?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await updateProduct(params.id, {
      prices: body.prices ?? {},
      stocks: body.stocks ?? {},
      available: Boolean(body.available),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}
