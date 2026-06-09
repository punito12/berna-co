import { prisma } from "@/lib/db";
import { countPendingChanges, getSiteContentAdmin } from "@/lib/cms-admin";

type SiteSnapshot = {
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

  const publishedAt = new Date();
  await getSiteContentAdmin();

  const [content, texts, images, sections] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany({ orderBy: { key: "asc" } }),
    prisma.siteImage.findMany({ orderBy: { key: "asc" } }),
    prisma.siteSection.findMany({ orderBy: { orderDraft: "asc" } }),
  ]);

  const snapshot: SiteSnapshot = {
    content: content
      ? {
          id: content.id,
          themeColors: content.themeColorsDraft,
          typography: content.typographyDraft,
          logoUrl: content.logoUrlDraft,
          publishedAt: publishedAt.toISOString(),
        }
      : null,
    texts: texts.map((t) => ({
      key: t.key,
      value: t.valueDraft,
      maxLength: t.maxLength,
      category: t.category,
    })),
    images: images.map((i) => ({
      key: i.key,
      url: i.urlDraft,
      category: i.category,
    })),
    sections: sections.map((s) => ({
      key: s.key,
      page: s.page,
      order: s.orderDraft,
      visible: s.visibleDraft,
      type: s.type,
      config: s.configDraft,
    })),
  };

  const version = await prisma.$transaction(async (tx) => {
    if (content) {
      await tx.siteContent.update({
        where: { id: "singleton" },
        data: {
          themeColors: content.themeColorsDraft,
          typography: content.typographyDraft,
          logoUrl: content.logoUrlDraft,
          publishedAt,
        },
      });
    }
    for (const text of texts) {
      await tx.siteText.update({
        where: { key: text.key },
        data: { value: text.valueDraft },
      });
    }
    for (const image of images) {
      await tx.siteImage.update({
        where: { key: image.key },
        data: { url: image.urlDraft },
      });
    }
    for (const section of sections) {
      await tx.siteSection.update({
        where: { key: section.key },
        data: {
          order: section.orderDraft,
          visible: section.visibleDraft,
          config: section.configDraft,
        },
      });
    }
    return tx.siteVersion.create({
      data: {
        snapshot: JSON.stringify(snapshot),
        publishedAt,
        publishedBy,
      },
      select: { id: true, publishedAt: true, publishedBy: true },
    });
  });

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
        data: { valueDraft: text.value },
      });
    }
    for (const image of images) {
      await tx.siteImage.update({
        where: { key: image.key },
        data: { urlDraft: image.url },
      });
    }
    for (const section of sections) {
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

export async function revertCmsToVersion(versionId: string) {
  const version = await prisma.siteVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) throw new Error("La versión no existe.");

  const snapshot = parseSnapshot(version.snapshot);
  const publishedAt = new Date();

  await prisma.$transaction(async (tx) => {
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
          maxLength: text.maxLength,
          category: text.category,
        },
        update: {
          value: text.value,
          valueDraft: text.value,
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
        publishedBy: `revert:${versionId}`,
      },
    });
  });

  return countPendingChanges();
}
