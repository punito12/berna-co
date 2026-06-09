import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { publishCmsDrafts } from "@/lib/cms-publish";

export async function POST() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const result = await publishCmsDrafts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cms publish]", error);
    return NextResponse.json(
      { error: "No se pudieron publicar los cambios." },
      { status: 500 }
    );
  }
}
