import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updatePricingConfig } from "@/lib/pricing";

// Update the global pricing parameters. Admin-only.
// POST { sueldoPercent, utilidadPercent, descuentoMayoristaPercent, descuentoKioscoPercent }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: {
    sueldoPercent?: number;
    utilidadPercent?: number;
    descuentoMayoristaPercent?: number;
    descuentoKioscoPercent?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await updatePricingConfig({
      sueldoPercent: Number(body.sueldoPercent),
      utilidadPercent: Number(body.utilidadPercent),
      descuentoMayoristaPercent: Number(body.descuentoMayoristaPercent),
      descuentoKioscoPercent: Number(body.descuentoKioscoPercent),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
