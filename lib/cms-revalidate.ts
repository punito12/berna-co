import { revalidatePath, revalidateTag } from "next/cache";
import { HOME_DATA_TAG } from "@/lib/home-data";

export function revalidateCmsPublicPaths() {
  revalidatePath("/", "layout");
  // Bustea la cache de datos de la home pública (textos/imágenes/secciones del
  // CMS) para que los cambios publicados se vean de inmediato, no recién al
  // expirar el revalidate.
  revalidateTag(HOME_DATA_TAG);
}
