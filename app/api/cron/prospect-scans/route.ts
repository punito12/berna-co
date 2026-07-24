import { NextResponse } from "next/server";
import { processNextProspectScanBatch } from "@/lib/prospect-scans";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado." },
      { status: 503 }
    );
  }
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const result = await processNextProspectScanBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("prospect scan cron error:", error);
    return NextResponse.json(
      { error: "No se pudo procesar el lote de scans." },
      { status: 500 }
    );
  }
}

