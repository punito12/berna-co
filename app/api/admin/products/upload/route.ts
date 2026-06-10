import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { uploadImageToBlob, UploadError } from "@/lib/uploads";

// Accepts an image upload (multipart/form-data, field "file") and stores it in
// Vercel Blob under productos/. Returns { url } pointing at the public file.
// Existing /images/... product URLs keep working as static fallbacks.

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

  try {
    const url = await uploadImageToBlob({
      file,
      allowedTypes: ALLOWED,
      maxBytes: MAX_BYTES,
      folder: "productos",
      namePrefix: "prod",
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadError) {
      const message =
        error.message === "Formato de imagen no permitido."
          ? "Formato no permitido. Subí una imagen JPG, PNG o WEBP."
          : error.message === "La imagen es muy pesada."
          ? "La imagen es muy pesada (máximo 6 MB)."
          : error.message;
      return NextResponse.json({ error: message }, { status: error.status });
    }
    console.error("upload error:", error);
    return NextResponse.json(
      { error: "No pudimos guardar la imagen. Probá de nuevo." },
      { status: 500 }
    );
  }
}
