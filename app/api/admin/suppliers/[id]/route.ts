import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

// Proveedores is disabled in Admin V2. Keep the route authenticated but non-mutable.
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  void params;
  return NextResponse.json(
    { error: "Caja/Compras está desactivado en Admin V2." },
    { status: 410 }
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  void params;
  return NextResponse.json(
    { error: "Caja/Compras está desactivado en Admin V2." },
    { status: 410 }
  );
}
