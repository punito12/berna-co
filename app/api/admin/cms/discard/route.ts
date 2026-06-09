import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { discardCmsDrafts } from "@/lib/cms-publish";

export async function POST() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const pending = await discardCmsDrafts();
    return NextResponse.json({ ok: true, pending });
  } catch (error) {
    console.error("[cms discard]", error);
    return NextResponse.json(
      { error: "No se pudieron descartar los cambios." },
      { status: 500 }
    );
  }
}
