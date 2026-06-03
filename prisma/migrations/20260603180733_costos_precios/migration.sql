-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "sueldoPercent" INTEGER NOT NULL DEFAULT 15,
    "utilidadPercent" INTEGER NOT NULL DEFAULT 50,
    "descuentoMayoristaPercent" INTEGER NOT NULL DEFAULT 25,
    "descuentoKioscoPercent" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "breadcrumbType" TEXT NOT NULL,
    "yieldKg" REAL NOT NULL,
    "packagingPerKg" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "computedCostPerKg" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "pricePerKg" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CostHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "breadcrumbType" TEXT NOT NULL,
    "costPerKg" INTEGER NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "breadcrumbType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "costs" TEXT NOT NULL DEFAULT '{}',
    "promoPercent" INTEGER NOT NULL DEFAULT 0,
    "promoType" TEXT NOT NULL DEFAULT '',
    "promoPercents" TEXT NOT NULL DEFAULT '{}',
    "promoTypes" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("available", "availableBreadcrumbs", "category", "costPerKg", "createdAt", "description", "disabledBreadcrumbs", "id", "imageUrl", "images", "isNew", "longDescription", "name", "price", "prices", "promoPercent", "promoPercents", "promoType", "promoTypes", "slug", "stock", "stocks", "updatedAt", "weightGrams") SELECT "available", "availableBreadcrumbs", "category", "costPerKg", "createdAt", "description", "disabledBreadcrumbs", "id", "imageUrl", "images", "isNew", "longDescription", "name", "price", "prices", "promoPercent", "promoPercents", "promoType", "promoTypes", "slug", "stock", "stocks", "updatedAt", "weightGrams" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productId_breadcrumbType_key" ON "Recipe"("productId", "breadcrumbType");

-- CreateIndex
CREATE INDEX "CostHistory_productId_breadcrumbType_idx" ON "CostHistory"("productId", "breadcrumbType");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_breadcrumbType_idx" ON "PriceHistory"("productId", "breadcrumbType");

