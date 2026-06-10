import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { uploadImageToBlob, UploadError } from "@/lib/uploads";

// Generic CMS image upload. multipart/form-data with field "file" and an
// optional "folder" (allowlisted). Returns { url }. Admin-only. New uploads go
// to Vercel Blob; existing /images/... URLs remain valid static fallbacks.
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

  const folderRaw = String(form.get("folder") ?? "");
  const folder = FOLDERS.has(folderRaw) ? folderRaw : "";
  const blobFolder = folder === "branding" ? "branding" : "cms";
  try {
    const url = await uploadImageToBlob({
      file,
      allowedTypes: ALLOWED,
      maxBytes: MAX_BYTES,
      folder: blobFolder,
      namePrefix: folder === "branding" ? "branding" : "cms",
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadError) {
      const message =
        error.message === "Formato de imagen no permitido."
          ? "Formato no permitido. Subí JPG, PNG, WEBP o SVG."
          : error.message === "La imagen es muy pesada."
          ? "La imagen es muy pesada (máximo 6 MB)."
          : error.message;
      return NextResponse.json({ error: message }, { status: error.status });
    }
    console.error("cms upload error:", error);
    return NextResponse.json(
      { error: "No pudimos guardar la imagen." },
      { status: 500 }
    );
  }
}
