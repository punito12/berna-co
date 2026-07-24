import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  changeProspectScanStatus,
  increaseProspectScanRequestLimit,
} from "@/lib/prospect-scans";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      action?: "PAUSE" | "RESUME" | "CANCEL" | "RETRY_FAILED";
      requestLimit?: number;
    };
    if (body.requestLimit !== undefined) {
      await increaseProspectScanRequestLimit(params.id, body.requestLimit);
    }
    if (!body.action) {
      return NextResponse.json({ ok: true });
    }
    const scan = await changeProspectScanStatus(params.id, body.action);
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar el scan." },
      { status: 400 }
    );
  }
}

