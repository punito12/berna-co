import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { countPendingChanges, getSiteContentAdmin } from "@/lib/cms-admin";
import {
  isDeletedBlockConfig,
  isDraftOnlyBlockConfig,
  normalizeBlockType,
  parseBlockConfig,
  validateBlockConfig,
} from "@/lib/cms-blocks";

export type SiteSnapshot = {
  content: {
    id: string;
    themeColors: string;
    typography: string;
    logoUrl: string;
    publishedAt: string | null;
  } | null;
  texts: {
    key: string;
    value: string;
    style: string;
    maxLength: number;
    category: string;
  }[];
  images: {
    key: string;
    url: string;
    category: string;
  }[];
  sections: {
    key: string;
    page: string;
    order: number;
    visible: boolean;
    type: string;
    config: string;
  }[];
};

export type CmsSafetyIssue = {
  code: string;
  label: string;
  detail: string;
};

export type CmsBackup = {
  kind: "berna-cms-backup";
  version: 1;
  exportedAt: string;
  snapshot: SiteSnapshot;
};

const ALLOWED_FONTS = new Set([
  "Archivo",
  "Inter",
  "Poppins",
  "Montserrat",
  "Bebas Neue",
  "Playfair Display",
  "Lora",
  "Roboto",
  "Oswald",
  "Raleway",
  "Work Sans",
  "Merriweather",
  "Nunito",
  "DM Sans",
  "Space Grotesk",
  "Fraunces",
  "Archivo Black",
  "Libre Franklin",
]);

const REQUIRED_TEXT_KEYS = [
  "home.hero.title",
  "home.hero.cta",
  "catalogo.title",
  "checkout.cta.confirm",
  "footer.slogan",
];

function parseSnapshot(raw: string): SiteSnapshot {
  const parsed = JSON.parse(raw) as Partial<SiteSnapshot>;
  if (
    !parsed ||
    !Array.isArray(parsed.texts) ||
    !Array.isArray(parsed.images) ||
    !Array.isArray(parsed.sections)
  ) {
    throw new Error("La versión guardada no tiene un snapshot válido.");
  }
  return parsed as SiteSnapshot;
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function snapshotFromRows({
  content,
  texts,
  images,
  sections,
  publishedAt,
  draft,
}: {
  content: Awaited<ReturnType<typeof getSiteContentAdmin>> | null;
  texts: Awaited<ReturnType<typeof prisma.siteText.findMany>>;
  images: Awaited<ReturnType<typeof prisma.siteImage.findMany>>;
  sections: Awaited<ReturnType<typeof prisma.siteSection.findMany>>;
  publishedAt: Date | null;
  draft: boolean;
}): SiteSnapshot {
  return {
    content: content
      ? {
          id: content.id,
          themeColors: draft ? content.themeColorsDraft : content.themeColors,
          typography: draft ? content.typographyDraft : content.typography,
          logoUrl: draft ? content.logoUrlDraft : content.logoUrl,
          publishedAt: publishedAt?.toISOString() ?? null,
        }
      : null,
    texts: texts.map((t) => ({
      key: t.key,
      value: draft ? t.valueDraft : t.value,
      style: draft ? t.styleDraft : t.style,
      maxLength: t.maxLength,
      category: t.category,
    })),
    images: images.map((i) => ({
      key: i.key,
      url: draft ? i.urlDraft : i.url,
      category: i.category,
    })),
    sections: sections.map((s) => ({
      key: s.key,
      page: s.page,
      order: draft ? s.orderDraft : s.order,
      visible: draft ? s.visibleDraft : s.visible,
      type: s.type,
      config: draft ? s.configDraft : s.config,
    })),
  };
}

export async function validateCmsDrafts(): Promise<CmsSafetyIssue[]> {
  await getSiteContentAdmin();
  const [content, texts, sections] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany({ orderBy: { key: "asc" } }),
    prisma.siteSection.findMany({ orderBy: { key: "asc" } }),
  ]);

  const issues: CmsSafetyIssue[] = [];

  const colors = parseObject(content?.themeColorsDraft ?? "{}");
  for (const key of ["ink", "cream", "line", "muted", "accent"]) {
    if (!isHex(colors?.[key])) {
      issues.push({
        code: `color.${key}`,
        label: "Color inválido",
        detail: `${key} tiene que ser un hex de 6 dígitos.`,
      });
    }
  }
  if (colors && isHex(colors.ink) && isHex(colors.cream)) {
    const ratio = contrastRatio(colors.ink, colors.cream);
    if (ratio < 4.5) {
      issues.push({
        code: "contrast.ink-cream",
        label: "Contraste bajo",
        detail: `Texto principal sobre fondo suave queda en ${ratio.toFixed(
          2
        )}:1; mínimo recomendado 4.5:1.`,
      });
    }
  }
  if (colors && isHex(colors.muted) && isHex(colors.cream)) {
    const ratio = contrastRatio(colors.muted, colors.cream);
    if (ratio < 4.5) {
      issues.push({
        code: "contrast.muted-cream",
        label: "Contraste bajo",
        detail: `Texto secundario sobre fondo suave queda en ${ratio.toFixed(
          2
        )}:1; mínimo recomendado 4.5:1.`,
      });
    }
  }

  const typography = parseObject(content?.typographyDraft ?? "{}");
  for (const key of ["headingFont", "bodyFont"]) {
    const value = typography?.[key];
    if (typeof value !== "string" || !ALLOWED_FONTS.has(value)) {
      issues.push({
        code: `typography.${key}`,
        label: "Tipografía no disponible",
        detail: `${key} tiene que usar una fuente de la lista del editor.`,
      });
    }
  }

  for (const key of REQUIRED_TEXT_KEYS) {
    const row = texts.find((t) => t.key === key);
    if (!row || row.valueDraft.trim().length === 0) {
      issues.push({
        code: `text.${key}`,
        label: "Texto obligatorio vacío",
        detail: `${key} no puede publicarse vacío.`,
      });
    }
  }

  for (const section of sections) {
    if (!section.visibleDraft) continue;
    if (isDeletedBlockConfig(section.configDraft)) continue;
    const parsedConfig = parseObject(section.configDraft);
    if (!parsedConfig) {
      issues.push({
        code: `section.${section.key}.config`,
        label: "Configuración inválida",
        detail: `${section.key} tiene un configDraft que no es JSON válido.`,
      });
      continue;
    }
    if (Object.keys(parsedConfig).length === 0) continue;
    const type = normalizeBlockType(section.type, section.key);
    const configIssues = validateBlockConfig(
      type,
      parseBlockConfig(section.configDraft)
    );
    for (const detail of configIssues) {
      issues.push({
        code: `section.${section.key}.config`,
        label: "Configuración inválida",
        detail: `${section.key}: ${detail}`,
      });
    }
  }

  return issues;
}

export async function listSiteVersions(limit = 20) {
  return prisma.siteVersion.findMany({
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, publishedAt: true, publishedBy: true },
  });
}

export async function publishCmsDrafts(publishedBy = "admin") {
  const pending = await countPendingChanges();
  if (pending.total === 0) return { pending, version: null };
  const issues = await validateCmsDrafts();
  if (issues.length > 0) {
    const error = new Error("Hay valores del CMS que deben corregirse.");
    (error as Error & { issues?: CmsSafetyIssue[] }).issues = issues;
    throw error;
  }

  const publishedAt = new Date();
  await getSiteContentAdmin();

  const [content, texts, images, sections] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany({ orderBy: { key: "asc" } }),
    prisma.siteImage.findMany({ orderBy: { key: "asc" } }),
    prisma.siteSection.findMany({ orderBy: { orderDraft: "asc" } }),
  ]);

  const publishedSections = sections.filter(
    (section) => !isDeletedBlockConfig(section.configDraft)
  );
  const snapshot = snapshotFromRows({
    content,
    texts,
    images,
    sections: publishedSections,
    publishedAt,
    draft: true,
  });

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  if (content) {
    operations.push(
      prisma.siteContent.update({
        where: { id: "singleton" },
        data: {
          themeColors: content.themeColorsDraft,
          typography: content.typographyDraft,
          logoUrl: content.logoUrlDraft,
          publishedAt,
        },
      })
    );
  }
  for (const text of texts) {
    operations.push(
      prisma.siteText.update({
        where: { key: text.key },
        data: { value: text.valueDraft, style: text.styleDraft },
      })
    );
  }
  for (const image of images) {
    operations.push(
      prisma.siteImage.update({
        where: { key: image.key },
        data: { url: image.urlDraft },
      })
    );
  }
  for (const section of sections) {
    if (isDeletedBlockConfig(section.configDraft)) {
      operations.push(prisma.siteSection.delete({ where: { key: section.key } }));
      continue;
    }
    operations.push(
      prisma.siteSection.update({
        where: { key: section.key },
        data: {
          order: section.orderDraft,
          visible: section.visibleDraft,
          type: normalizeBlockType(section.type, section.key),
          config: section.configDraft,
        },
      })
    );
  }
  operations.push(
    prisma.siteVersion.create({
      data: {
        snapshot: JSON.stringify(snapshot),
        publishedAt,
        publishedBy,
      },
      select: { id: true, publishedAt: true, publishedBy: true },
    })
  );

  const results = await prisma.$transaction(operations);
  const version = results[results.length - 1] as {
    id: string;
    publishedAt: Date;
    publishedBy: string;
  };

  return { pending, version };
}

export async function discardCmsDrafts() {
  await getSiteContentAdmin();
  const [content, texts, images, sections] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany(),
    prisma.siteImage.findMany(),
    prisma.siteSection.findMany(),
  ]);

  await prisma.$transaction(async (tx) => {
    if (content) {
      await tx.siteContent.update({
        where: { id: "singleton" },
        data: {
          themeColorsDraft: content.themeColors,
          typographyDraft: content.typography,
          logoUrlDraft: content.logoUrl,
        },
      });
    }
    for (const text of texts) {
      await tx.siteText.update({
        where: { key: text.key },
        data: { valueDraft: text.value, styleDraft: text.style },
      });
    }
    for (const image of images) {
      await tx.siteImage.update({
        where: { key: image.key },
        data: { urlDraft: image.url },
      });
    }
    for (const section of sections) {
      if (isDraftOnlyBlockConfig(section.config)) {
        await tx.siteSection.delete({ where: { key: section.key } });
        continue;
      }
      await tx.siteSection.update({
        where: { key: section.key },
        data: {
          orderDraft: section.order,
          visibleDraft: section.visible,
          configDraft: section.config,
        },
      });
    }
  });

  return countPendingChanges();
}

export async function exportCmsBackup(): Promise<CmsBackup> {
  await getSiteContentAdmin();
  const [content, texts, images, sections] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany({ orderBy: { key: "asc" } }),
    prisma.siteImage.findMany({ orderBy: { key: "asc" } }),
    prisma.siteSection.findMany({ orderBy: { order: "asc" } }),
  ]);
  return {
    kind: "berna-cms-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: snapshotFromRows({
      content,
      texts,
      images,
      sections,
      publishedAt: content?.publishedAt ?? null,
      draft: false,
    }),
  };
}

export async function importCmsBackup(input: unknown) {
  const backup = input as Partial<CmsBackup>;
  const snapshot =
    backup.kind === "berna-cms-backup" && backup.version === 1
      ? backup.snapshot
      : (input as SiteSnapshot);
  if (!snapshot) throw new Error("El backup no tiene contenido para restaurar.");
  parseSnapshot(JSON.stringify(snapshot));
  await applySnapshot(snapshot, "import");
  return countPendingChanges();
}

async function applySnapshot(snapshot: SiteSnapshot, publishedBy: string) {
  const publishedAt = new Date();
  const textKeys = snapshot.texts.map((text) => text.key);
  const imageKeys = snapshot.images.map((image) => image.key);
  const sectionKeys = snapshot.sections.map((section) => section.key);

  await prisma.$transaction(async (tx) => {
    if (!snapshot.content) {
      await tx.siteContent.deleteMany({ where: { id: "singleton" } });
    }
    if (textKeys.length > 0) {
      await tx.siteText.deleteMany({ where: { key: { notIn: textKeys } } });
    } else {
      await tx.siteText.deleteMany();
    }
    if (imageKeys.length > 0) {
      await tx.siteImage.deleteMany({ where: { key: { notIn: imageKeys } } });
    } else {
      await tx.siteImage.deleteMany();
    }
    if (sectionKeys.length > 0) {
      await tx.siteSection.deleteMany({ where: { key: { notIn: sectionKeys } } });
    } else {
      await tx.siteSection.deleteMany();
    }

    if (snapshot.content) {
      await tx.siteContent.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          themeColors: snapshot.content.themeColors,
          themeColorsDraft: snapshot.content.themeColors,
          typography: snapshot.content.typography,
          typographyDraft: snapshot.content.typography,
          logoUrl: snapshot.content.logoUrl,
          logoUrlDraft: snapshot.content.logoUrl,
          publishedAt,
        },
        update: {
          themeColors: snapshot.content.themeColors,
          themeColorsDraft: snapshot.content.themeColors,
          typography: snapshot.content.typography,
          typographyDraft: snapshot.content.typography,
          logoUrl: snapshot.content.logoUrl,
          logoUrlDraft: snapshot.content.logoUrl,
          publishedAt,
        },
      });
    }
    for (const text of snapshot.texts) {
      await tx.siteText.upsert({
        where: { key: text.key },
        create: {
          key: text.key,
          value: text.value,
          valueDraft: text.value,
          style: text.style ?? "{}",
          styleDraft: text.style ?? "{}",
          maxLength: text.maxLength,
          category: text.category,
        },
        update: {
          value: text.value,
          valueDraft: text.value,
          style: text.style ?? "{}",
          styleDraft: text.style ?? "{}",
          maxLength: text.maxLength,
          category: text.category,
        },
      });
    }
    for (const image of snapshot.images) {
      await tx.siteImage.upsert({
        where: { key: image.key },
        create: {
          key: image.key,
          url: image.url,
          urlDraft: image.url,
          category: image.category,
        },
        update: {
          url: image.url,
          urlDraft: image.url,
          category: image.category,
        },
      });
    }
    for (const section of snapshot.sections) {
      await tx.siteSection.upsert({
        where: { key: section.key },
        create: {
          key: section.key,
          page: section.page,
          order: section.order,
          orderDraft: section.order,
          visible: section.visible,
          visibleDraft: section.visible,
          type: section.type,
          config: section.config,
          configDraft: section.config,
        },
        update: {
          page: section.page,
          order: section.order,
          orderDraft: section.order,
          visible: section.visible,
          visibleDraft: section.visible,
          type: section.type,
          config: section.config,
          configDraft: section.config,
        },
      });
    }
    await tx.siteVersion.create({
      data: {
        snapshot: JSON.stringify({
          ...snapshot,
          content: snapshot.content
            ? { ...snapshot.content, publishedAt: publishedAt.toISOString() }
            : null,
        }),
        publishedAt,
        publishedBy,
      },
    });
  });
}

export async function revertCmsToVersion(versionId: string) {
  const version = await prisma.siteVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) throw new Error("La versión no existe.");

  const snapshot = parseSnapshot(version.snapshot);
  await applySnapshot(snapshot, `revert:${versionId}`);

  return countPendingChanges();
}
