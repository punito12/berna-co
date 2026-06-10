import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { revertCmsToVersion } from "@/lib/cms-publish";
import { revalidateCmsPublicPaths } from "@/lib/cms-revalidate";

export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: { versionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (!body.versionId)
    return NextResponse.json(
      { error: "Falta la versión a restaurar." },
      { status: 400 }
    );

  try {
    const pending = await revertCmsToVersion(body.versionId);
    revalidateCmsPublicPaths();
    return NextResponse.json({ ok: true, pending });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo revertir." },
      { status: 400 }
    );
  }
}
