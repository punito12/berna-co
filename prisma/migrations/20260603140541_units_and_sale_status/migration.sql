-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ManualSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "soldAt" DATETIME NOT NULL,
    "channel" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "neighborhood" TEXT,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "gross" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "net" INTEGER NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "dueDate" DATETIME,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ManualSale" ("channel", "createdAt", "customerId", "customerName", "discountAmount", "discountPct", "dueDate", "gross", "id", "neighborhood", "net", "notes", "paymentStatus", "soldAt", "updatedAt") SELECT "channel", "createdAt", "customerId", "customerName", "discountAmount", "discountPct", "dueDate", "gross", "id", "neighborhood", "net", "notes", "paymentStatus", "soldAt", "updatedAt" FROM "ManualSale";
DROP TABLE "ManualSale";
ALTER TABLE "new_ManualSale" RENAME TO "ManualSale";
CREATE TABLE "new_SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "breadcrumbType" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineSubtotal" INTEGER NOT NULL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ManualSale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Map the old qtyKg (kg) into the new quantity (units). Existing rows keep
-- their number (rounded, at least 1) so no sale loses its lines.
INSERT INTO "new_SaleItem" ("id", "lineSubtotal", "productId", "productName", "saleId", "unitPrice", "quantity") SELECT "id", "lineSubtotal", "productId", "productName", "saleId", "unitPrice", MAX(1, CAST(ROUND("qtyKg") AS INTEGER)) FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

