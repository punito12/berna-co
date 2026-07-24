import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  dismissProspectDuplicate,
  mergeProspectDuplicate,
} from "@/lib/prospects";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      action?: "MERGE" | "DISMISS";
      primaryId?: string;
    };
    const result =
      body.action === "MERGE"
        ? await mergeProspectDuplicate(params.id, body.primaryId ?? "")
        : await dismissProspectDuplicate(params.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo revisar el duplicado." },
      { status: 400 }
    );
  }
}

