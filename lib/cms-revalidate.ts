import { revalidatePath } from "next/cache";

export function revalidateCmsPublicPaths() {
  revalidatePath("/", "layout");
}
