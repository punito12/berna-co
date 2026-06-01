import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteManualSale } from "@/lib/management";

// Deletes a manual sale. Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteManualSale(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
