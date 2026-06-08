import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { isAuthenticated } from "@/lib/auth";

// Generic CMS image upload. multipart/form-data with field "file" and an
// optional "folder" (allowlisted). Returns { url }. Admin-only.
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);
const FOLDERS = new Set(["branding", ""]); // "" = /public/images

export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Subida inválida." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  const ext = ALLOWED.get(file.type);
  if (!ext)
    return NextResponse.json(
      { error: "Formato no permitido. Subí JPG, PNG, WEBP o SVG." },
      { status: 400 }
    );
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "La imagen es muy pesada (máximo 6 MB)." },
      { status: 400 }
    );

  const folderRaw = String(form.get("folder") ?? "");
  const folder = FOLDERS.has(folderRaw) ? folderRaw : "";
  const name = `cms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const segments = ["public", "images", ...(folder ? [folder] : [])];
  const dir = path.join(process.cwd(), ...segments);
  try {
    await mkdir(dir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), bytes);
  } catch (error) {
    console.error("cms upload error:", error);
    return NextResponse.json(
      { error: "No pudimos guardar la imagen." },
      { status: 500 }
    );
  }

  const url = `/images/${folder ? `${folder}/` : ""}${name}`;
  return NextResponse.json({ url });
}
