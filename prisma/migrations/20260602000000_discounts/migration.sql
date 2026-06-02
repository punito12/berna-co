-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "minTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "prices" TEXT NOT NULL DEFAULT '{}',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stocks" TEXT NOT NULL DEFAULT '{}',
    "images" TEXT NOT NULL DEFAULT '[]',
    "availableBreadcrumbs" TEXT NOT NULL,
    "disabledBreadcrumbs" TEXT NOT NULL DEFAULT '[]',
    "costPerKg" INTEGER NOT NULL DEFAULT 0,
    "promoPercent" INTEGER NOT NULL DEFAULT 0,
    "promoType" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("available", "availableBreadcrumbs", "category", "costPerKg", "createdAt", "description", "disabledBreadcrumbs", "id", "imageUrl", "images", "isNew", "longDescription", "name", "price", "prices", "slug", "stock", "stocks", "updatedAt", "weightGrams") SELECT "available", "availableBreadcrumbs", "category", "costPerKg", "createdAt", "description", "disabledBreadcrumbs", "id", "imageUrl", "images", "isNew", "longDescription", "name", "price", "prices", "slug", "stock", "stocks", "updatedAt", "weightGrams" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

