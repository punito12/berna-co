import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { publishCmsDrafts } from "@/lib/cms-publish";
import { revalidateCmsPublicPaths } from "@/lib/cms-revalidate";

export async function POST() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const result = await publishCmsDrafts();
    revalidateCmsPublicPaths();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const issues = (error as Error & { issues?: unknown[] }).issues;
    if (issues) {
      return NextResponse.json(
        {
          error: "Modo seguro: corregí estos valores antes de publicar.",
          issues,
        },
        { status: 400 }
      );
    }
    console.error("[cms publish]", error);
    return NextResponse.json(
      { error: "No se pudieron publicar los cambios." },
      { status: 500 }
    );
  }
}
