import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setStyleSettingsDraft } from "@/lib/cms-admin";
import { sanitizeStyleSettings } from "@/lib/cms-style-settings";

// Save the non-color global style settings draft (shapes, shadows, fonts,
// sizes, uppercase). Admin-only. Values are sanitized to a controlled set, so
// no arbitrary CSS can be injected. Stored under typography.styles.
// POST { styles: { buttonRadius, cardShadow, nameFont, ... } }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { styles?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const safe = sanitizeStyleSettings(body.styles);
  try {
    await setStyleSettingsDraft(safe);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
