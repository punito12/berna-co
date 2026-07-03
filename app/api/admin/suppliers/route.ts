import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

// Proveedores is disabled in Admin V2. Keep the route authenticated but non-mutable.
export async function POST(_request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return NextResponse.json(
    { error: "Caja/Compras está desactivado en Admin V2." },
    { status: 410 }
  );
}
