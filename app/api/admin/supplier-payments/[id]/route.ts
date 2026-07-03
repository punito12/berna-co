import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

// Supplier payments are disabled with Compras/Caja in Admin V2.
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
