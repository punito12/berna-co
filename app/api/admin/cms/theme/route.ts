import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setThemeColorsDraft } from "@/lib/cms-admin";

// Save the theme colors draft. Admin-only. POST { colors: {ink, cream, ...} }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { colors?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const colors = body.colors ?? {};
  // Basic hex validation.
  for (const [k, v] of Object.entries(colors)) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(v))
      return NextResponse.json(
        { error: `Color inválido en ${k}: ${v}` },
        { status: 400 }
      );
  }
  try {
    await setThemeColorsDraft(colors);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
