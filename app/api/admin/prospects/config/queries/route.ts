import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveProspectQuery } from "@/lib/prospects";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Parameters<typeof saveProspectQuery>[1];
    const query = await saveProspectQuery(null, body);
    return NextResponse.json({ ok: true, query });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear la consulta." },
      { status: 400 }
    );
  }
}

