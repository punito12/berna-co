import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { editSale, type EditSaleInput } from "@/lib/sale-actions";
import type { SaleKind } from "@/lib/sales-detail";

// Edit a web order or manual sale (items + fields), reconciling stock by the
// difference and recomputing totals. Admin-only.
// POST { kind, id, ...EditSaleInput }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: { kind?: string; id?: string } & EditSaleInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const kind: SaleKind | null =
    body.kind === "ORDER" ? "ORDER" : body.kind === "MANUAL" ? "MANUAL" : null;
  if (!kind || !body.id)
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });

  try {
    await editSale(kind, body.id, {
      items: body.items,
      notes: body.notes,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      address: body.address,
      scheduledDate: body.scheduledDate,
      scheduledSlot: body.scheduledSlot,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
