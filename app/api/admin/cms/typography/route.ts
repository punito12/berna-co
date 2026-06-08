import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setTypographyDraft } from "@/lib/cms-admin";

// Save the typography draft. Admin-only.
// POST { typography: { headingFont, bodyFont, headingWeight } }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { typography?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await setTypographyDraft(body.typography ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
