import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { exportCmsBackup, importCmsBackup } from "@/lib/cms-publish";
import { revalidateCmsPublicPaths } from "@/lib/cms-revalidate";

export async function GET() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const backup = await exportCmsBackup();
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="berna-cms-${backup.exportedAt.slice(
          0,
          10
        )}.json"`,
      },
    });
  } catch (error) {
    console.error("[cms backup export]", error);
    return NextResponse.json(
      { error: "No se pudo exportar el backup." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = await request.json();
    const pending = await importCmsBackup(body);
    revalidateCmsPublicPaths();
    return NextResponse.json({ ok: true, pending });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo importar el backup." },
      { status: 400 }
    );
  }
}
