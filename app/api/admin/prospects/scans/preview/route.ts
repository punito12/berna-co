import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { previewProspectScan } from "@/lib/prospect-scans";

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      zoneId?: string;
      queryIds?: string[];
      requestLimit?: number;
      resultLimitPerRequest?: number;
    };
    const preview = await previewProspectScan(body.zoneId ?? "", body);
    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo estimar el scan." },
      { status: 400 }
    );
  }
}
