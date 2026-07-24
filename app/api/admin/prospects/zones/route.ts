import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createProspectZone } from "@/lib/prospects";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Parameters<typeof createProspectZone>[0];
    const zone = await createProspectZone(body);
    return NextResponse.json({ ok: true, zone });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear la zona." },
      { status: 400 }
    );
  }
}

