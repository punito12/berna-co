// CMS write helpers (admin). All edits go to the *Draft fields — nothing is
// shown to customers until it's published (Fase 4). Reads here return BOTH the
// published and draft values so the editor can show "changed" state and the
// "restaurar al original" action.

import { prisma } from "@/lib/db";
import {
  defaultBlockConfig,
  isCmsBlockType,
  isDeletedBlockConfig,
  isDraftOnlyBlockConfig,
  normalizeBlockType,
  sanitizeBlockConfig,
  type CmsBlockType,
} from "@/lib/cms-blocks";

// ---- Theme + typography + logo ---------------------------------------------

export async function getSiteContentAdmin() {
  let c = await prisma.siteContent.findUnique({ where: { id: "singleton" } });
  if (!c) {
    c = await prisma.siteContent.create({ data: { id: "singleton" } });
  }
  return c;
}

export async function setThemeColorsDraft(colors: Record<string, string>) {
  await getSiteContentAdmin();
  await prisma.siteContent.update({
    where: { id: "singleton" },
    data: { themeColorsDraft: JSON.stringify(colors) },
  });
}

export async function setTypographyDraft(typo: Record<string, string>) {
  await getSiteContentAdmin();
  await prisma.siteContent.update({
    where: { id: "singleton" },
    data: { typographyDraft: JSON.stringify(typo) },
  });
}

export async function setLogoDraft(url: string) {
  await getSiteContentAdmin();
  await prisma.siteContent.update({
    where: { id: "singleton" },
    data: { logoUrlDraft: url },
  });
}

// ---- Texts ------------------------------------------------------------------

export async function setTextDraft(key: string, valueDraft: string) {
  const row = await prisma.siteText.findUnique({ where: { key } });
  if (!row) throw new Error(`Texto "${key}" no existe.`);
  const v =
    row.maxLength > 0 ? valueDraft.slice(0, row.maxLength) : valueDraft;
  await prisma.siteText.update({ where: { key }, data: { valueDraft: v } });
}

// Restore one text's draft to its published value.
export async function restoreTextDraft(key: string) {
  const row = await prisma.siteText.findUnique({ where: { key } });
  if (!row) throw new Error(`Texto "${key}" no existe.`);
  await prisma.siteText.update({
    where: { key },
    data: { valueDraft: row.value },
  });
}

export async function listTextsByCategory(category: string) {
  return prisma.siteText.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });
}

// ---- Images -----------------------------------------------------------------

export async function setImageDraft(key: string, urlDraft: string) {
  const row = await prisma.siteImage.findUnique({ where: { key } });
  if (!row) throw new Error(`Imagen "${key}" no existe.`);
  await prisma.siteImage.update({ where: { key }, data: { urlDraft } });
}

export async function getImageAdmin(key: string) {
  return prisma.siteImage.findUnique({ where: { key } });
}

// ---- Sections ---------------------------------------------------------------

export async function listSectionsAdmin(page: string) {
  const sections = await prisma.siteSection.findMany({
    where: { page },
    orderBy: { orderDraft: "asc" },
  });
  return sections.filter((section) => !isDeletedBlockConfig(section.configDraft));
}

// Reorder: takes the ordered list of section keys and writes orderDraft.
export async function reorderSectionsDraft(page: string, keysInOrder: string[]) {
  await prisma.$transaction(
    keysInOrder.map((key, idx) =>
      prisma.siteSection.update({
        where: { key },
        data: { orderDraft: idx },
      })
    )
  );
  void page;
}

export async function setSectionVisibleDraft(key: string, visible: boolean) {
  await prisma.siteSection.update({
    where: { key },
    data: { visibleDraft: visible },
  });
}

export async function setSectionConfigDraft(
  key: string,
  config: Record<string, unknown>
) {
  const section = await prisma.siteSection.findUnique({ where: { key } });
  if (!section) throw new Error("La sección no existe.");
  const type = normalizeBlockType(section.type, section.key);
  const safe = sanitizeBlockConfig(config);
  await prisma.siteSection.update({
    where: { key },
    data: { configDraft: JSON.stringify(safe), type },
  });
}

export async function createSectionDraft({
  page,
  type,
}: {
  page: string;
  type: CmsBlockType;
}) {
  if (!isCmsBlockType(type)) throw new Error("Tipo de sección inválido.");
  const count = await prisma.siteSection.count({ where: { page } });
  const key = `${page}.${type}.${Date.now().toString(36)}`;
  const config = JSON.stringify(defaultBlockConfig(type));
  const unpublishedConfig = JSON.stringify({ __draftOnly: true });
  return prisma.siteSection.create({
    data: {
      key,
      page,
      type,
      order: count,
      orderDraft: count,
      visible: false,
      visibleDraft: true,
      config: unpublishedConfig,
      configDraft: config,
    },
  });
}

export async function duplicateSectionDraft(key: string) {
  const section = await prisma.siteSection.findUnique({ where: { key } });
  if (!section) throw new Error("La sección no existe.");
  const count = await prisma.siteSection.count({ where: { page: section.page } });
  const newKey = `${section.page}.${normalizeBlockType(
    section.type,
    section.key
  )}.${Date.now().toString(36)}`;
  const unpublishedConfig = JSON.stringify({ __draftOnly: true });
  return prisma.siteSection.create({
    data: {
      key: newKey,
      page: section.page,
      type: normalizeBlockType(section.type, section.key),
      order: count,
      orderDraft: count,
      visible: false,
      visibleDraft: section.visibleDraft,
      config: unpublishedConfig,
      configDraft: section.configDraft,
    },
  });
}

export async function deleteSectionDraft(key: string) {
  const section = await prisma.siteSection.findUnique({ where: { key } });
  if (!section) throw new Error("La sección no existe.");
  if (isDraftOnlyBlockConfig(section.config)) {
    await prisma.siteSection.delete({ where: { key } });
    return;
  }
  let config: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(section.configDraft);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      config = parsed;
    }
  } catch {
    config = {};
  }
  await prisma.siteSection.update({
    where: { key },
    data: {
      visibleDraft: false,
      configDraft: JSON.stringify({ ...config, __deleted: true }),
    },
  });
}

// ---- Pending-changes summary (for the editor status badge) -----------------

export type PendingChanges = {
  total: number;
  texts: number;
  images: number;
  sections: number;
  theme: boolean;
  typography: boolean;
  logo: boolean;
};

export async function countPendingChanges(): Promise<PendingChanges> {
  const [texts, images, sections, content] = await Promise.all([
    prisma.siteText.findMany({ select: { value: true, valueDraft: true } }),
    prisma.siteImage.findMany({ select: { url: true, urlDraft: true } }),
    prisma.siteSection.findMany({
      select: {
        order: true,
        orderDraft: true,
        visible: true,
        visibleDraft: true,
        config: true,
        configDraft: true,
      },
    }),
    getSiteContentAdmin(),
  ]);

  const tx = texts.filter((t) => t.value !== t.valueDraft).length;
  const im = images.filter((i) => i.url !== i.urlDraft).length;
  const sc = sections.filter(
    (s) =>
      s.order !== s.orderDraft ||
      s.visible !== s.visibleDraft ||
      s.config !== s.configDraft
  ).length;
  const theme = content.themeColors !== content.themeColorsDraft;
  const typography = content.typography !== content.typographyDraft;
  const logo = content.logoUrl !== content.logoUrlDraft;

  const total =
    tx + im + sc + (theme ? 1 : 0) + (typography ? 1 : 0) + (logo ? 1 : 0);
  return { total, texts: tx, images: im, sections: sc, theme, typography, logo };
}
