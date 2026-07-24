import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveProspectScoringRules } from "@/lib/prospects";

export async function PATCH(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as unknown;
    await saveProspectScoringRules(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar el scoring." },
      { status: 400 }
    );
  }
}

