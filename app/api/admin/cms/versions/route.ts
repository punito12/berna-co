import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listSiteVersions } from "@/lib/cms-publish";

export async function GET() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const versions = await listSiteVersions(20);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("[cms versions]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el historial." },
      { status: 500 }
    );
  }
}
