import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createProspectScan } from "@/lib/prospect-scans";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Parameters<typeof createProspectScan>[0];
    const scan = await createProspectScan(body);
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo iniciar el scan." },
      { status: 400 }
    );
  }
}

