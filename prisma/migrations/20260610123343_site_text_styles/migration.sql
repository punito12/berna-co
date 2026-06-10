-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "valueDraft" TEXT NOT NULL DEFAULT '',
    "style" TEXT NOT NULL DEFAULT '{}',
    "styleDraft" TEXT NOT NULL DEFAULT '{}',
    "maxLength" INTEGER NOT NULL DEFAULT 200,
    "category" TEXT NOT NULL DEFAULT 'home',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteText" ("category", "id", "key", "maxLength", "updatedAt", "value", "valueDraft") SELECT "category", "id", "key", "maxLength", "updatedAt", "value", "valueDraft" FROM "SiteText";
DROP TABLE "SiteText";
ALTER TABLE "new_SiteText" RENAME TO "SiteText";
CREATE UNIQUE INDEX "SiteText_key_key" ON "SiteText"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

