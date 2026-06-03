import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deletePurchase } from "@/lib/purchases";

// Delete a purchase (reverses its Caja expenses). Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    await deletePurchase(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
