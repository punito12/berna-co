import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { applyAllSuggested } from "@/lib/pricing";

// Copy suggested price → public price for the whole table. Admin-only.
export async function POST() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const changed = await applyAllSuggested();
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo aplicar." },
      { status: 400 }
    );
  }
}
