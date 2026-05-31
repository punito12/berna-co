import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { isAuthenticated } from "@/lib/auth";

// Accepts an image upload (multipart/form-data, field "file") and stores it in
// /public/images/productos/ with a unique filename. Returns { url } pointing at
// the saved file. Admin-only.

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Subida inválida." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no permitido. Subí una imagen JPG, PNG o WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen es muy pesada (máximo 6 MB)." },
      { status: 400 }
    );
  }

  // Unique filename so re-uploads don't collide or get cached stale.
  const name = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "images", "productos");
  try {
    await mkdir(dir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), bytes);
  } catch (error) {
    console.error("upload error:", error);
    return NextResponse.json(
      { error: "No pudimos guardar la imagen. Probá de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/images/productos/${name}` });
}
