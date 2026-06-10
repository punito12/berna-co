import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { publishCmsDrafts } from "@/lib/cms-publish";
import { revalidateCmsPublicPaths } from "@/lib/cms-revalidate";

function errorInfo(error: unknown) {
  const e = error as Error & { code?: string; meta?: { modelName?: string } };
  return {
    name: e.name,
    code: e.code,
    modelName: e.meta?.modelName,
    message: e.message,
  };
}

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
    const info = errorInfo(error);
    console.error("[cms publish]", info);
    if (info.code === "P2028") {
      return NextResponse.json(
        {
          error:
            "No se pudo publicar porque la base cerró la transacción. Intentá nuevamente.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "No se pudieron publicar los cambios." },
      { status: 500 }
    );
  }
}
