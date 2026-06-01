import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  updateCustomer,
  deleteCustomer,
  type CustomerInput,
} from "@/lib/management";

// Updates a customer. Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    await updateCustomer(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

// Deletes a customer. Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteCustomer(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
