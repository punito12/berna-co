import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateProspect } from "@/lib/prospects";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      status?: string;
      notes?: string;
      manualCategory?: string | null;
      manualScore?: number | null;
      manualScoreReason?: string | null;
    };
    const prospect = await updateProspect(params.id, body);
    return NextResponse.json({ ok: true, prospect });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

