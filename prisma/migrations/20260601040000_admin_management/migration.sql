-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "defaultDiscount" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ManualSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "soldAt" DATETIME NOT NULL,
    "channel" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "gross" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "net" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "qtyKg" REAL NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineSubtotal" INTEGER NOT NULL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ManualSale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("available", "availableBreadcrumbs", "category", "createdAt", "description", "disabledBreadcrumbs", "id", "imageUrl", "images", "isNew", "name", "price", "prices", "slug", "stock", "stocks", "updatedAt", "weightGrams") SELECT "available", "availableBreadcrumbs", "category", "createdAt", "description", "disabledBreadcrumbs", "id", "imageUrl", "images", "isNew", "name", "price", "prices", "slug", "stock", "stocks", "updatedAt", "weightGrams" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

