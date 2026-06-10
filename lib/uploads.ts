import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export class UploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type UploadFileOptions = {
  file: File;
  allowedTypes: Map<string, string>;
  maxBytes: number;
  folder: string;
  namePrefix: string;
};

function safeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uploadImageToBlob({
  file,
  allowedTypes,
  maxBytes,
  folder,
  namePrefix,
}: UploadFileOptions): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new UploadError(
      "Falta configurar BLOB_READ_WRITE_TOKEN para subir imágenes.",
      503
    );
  }

  const ext = allowedTypes.get(file.type);
  if (!ext) {
    throw new UploadError("Formato de imagen no permitido.", 400);
  }

  if (file.size > maxBytes) {
    throw new UploadError("La imagen es muy pesada.", 400);
  }

  const cleanFolder = safeSegment(folder);
  const cleanPrefix = safeSegment(namePrefix) || "upload";
  const filename = `${cleanPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const pathname = cleanFolder ? `${cleanFolder}/${filename}` : filename;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return blob.url;
}
