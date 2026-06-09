import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getCmsPreviewToken } from "@/lib/cms-preview";

export async function GET() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const token = getCmsPreviewToken();
  if (!token)
    return NextResponse.json(
      { error: "No hay contraseña admin configurada." },
      { status: 503 }
    );
  return NextResponse.json({ token });
}
