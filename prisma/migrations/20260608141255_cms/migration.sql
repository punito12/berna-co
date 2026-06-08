-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "themeColors" TEXT NOT NULL DEFAULT '{}',
    "themeColorsDraft" TEXT NOT NULL DEFAULT '{}',
    "typography" TEXT NOT NULL DEFAULT '{}',
    "typographyDraft" TEXT NOT NULL DEFAULT '{}',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "logoUrlDraft" TEXT NOT NULL DEFAULT '',
    "publishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "valueDraft" TEXT NOT NULL DEFAULT '',
    "maxLength" INTEGER NOT NULL DEFAULT 200,
    "category" TEXT NOT NULL DEFAULT 'home',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "urlDraft" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'home',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT 'home',
    "order" INTEGER NOT NULL DEFAULT 0,
    "orderDraft" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "visibleDraft" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "configDraft" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshot" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT NOT NULL DEFAULT 'admin'
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteText_key_key" ON "SiteText"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SiteImage_key_key" ON "SiteImage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSection_key_key" ON "SiteSection"("key");

