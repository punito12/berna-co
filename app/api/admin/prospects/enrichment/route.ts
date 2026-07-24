import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  enrichSelectedProspects,
  previewProspectEnrichment,
} from "@/lib/prospect-enrichment";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      ids?: string[];
      preview?: boolean;
      confirmed?: boolean;
    };
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (body.preview) {
      const preview = await previewProspectEnrichment(ids);
      return NextResponse.json({ ok: true, preview });
    }
    const result = await enrichSelectedProspects(ids, body.confirmed === true);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo enriquecer." },
      { status: 400 }
    );
  }
}
