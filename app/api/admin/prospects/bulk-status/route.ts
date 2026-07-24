import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { bulkUpdateProspectStatus } from "@/lib/prospects";

export async function PATCH(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { ids?: string[]; status?: string };
    const result = await bulkUpdateProspectStatus(
      Array.isArray(body.ids) ? body.ids : [],
      body.status ?? ""
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

