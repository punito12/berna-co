// Siembra las claves del CMS de contenido v2 que todavía no existen en la DB.
// Create-only: si la clave ya existe NO la toca (update: {}), así jamás pisa
// contenido cargado por el negocio. Correr con:
//   export DATABASE_URL="$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"')" && npx tsx scripts/seed-contenido.ts
import { PrismaClient } from "@prisma/client";
import {
  CONTENT_SECTIONS,
  categoryForSection,
} from "../lib/cms-content-schema";

const prisma = new PrismaClient();

async function main() {
  let createdTexts = 0;
  let createdImages = 0;
  let skipped = 0;

  for (const section of CONTENT_SECTIONS) {
    const category = categoryForSection(section.id);
    for (const field of section.fields) {
      if (field.kind === "text") {
        const existing = await prisma.siteText.findUnique({
          where: { key: field.key },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await prisma.siteText.create({
          data: {
            key: field.key,
            value: field.fallback,
            valueDraft: field.fallback,
            maxLength: field.maxLength,
            category,
          },
        });
        createdTexts++;
      } else {
        const existing = await prisma.siteImage.findUnique({
          where: { key: field.key },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await prisma.siteImage.create({
          data: {
            key: field.key,
            url: field.fallback,
            urlDraft: field.fallback,
            category,
          },
        });
        createdImages++;
      }
    }
  }

  console.log(
    `Textos creados: ${createdTexts} · Imágenes creadas: ${createdImages} · Ya existían: ${skipped}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
