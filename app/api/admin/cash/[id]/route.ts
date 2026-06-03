import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteMovement } from "@/lib/cash";

// Delete a Caja movement. Admin-only. Auto-generated movements (from orders /
// sales) can be deleted too — they will be re-created if the source re-fires.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteMovement(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
