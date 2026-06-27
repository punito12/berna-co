import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { duplicatePresupuesto } from "@/lib/presupuestos";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const p = await duplicatePresupuesto(params.id);
    return NextResponse.json({ ok: true, id: p.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo duplicar." },
      { status: 400 }
    );
  }
}
