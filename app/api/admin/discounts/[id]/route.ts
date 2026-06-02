import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  updateDiscountCode,
  deleteDiscountCode,
  type DiscountCodeInput,
} from "@/lib/management";

// Updates a discount code. Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: DiscountCodeInput;
  try {
    body = (await request.json()) as DiscountCodeInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await updateDiscountCode(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

// Deletes a discount code. Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteDiscountCode(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
