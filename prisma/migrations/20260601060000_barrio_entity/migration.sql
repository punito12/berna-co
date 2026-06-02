-- CreateTable
CREATE TABLE "Barrio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MINORISTA',
    "defaultDiscount" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "lot" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "barrioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_barrioId_fkey" FOREIGN KEY ("barrioId") REFERENCES "Barrio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "defaultDiscount", "id", "lot", "name", "notes", "phone", "type", "updatedAt") SELECT "createdAt", "defaultDiscount", "id", "lot", "name", "notes", "phone", "type", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "deliveryType" TEXT NOT NULL,
    "address" TEXT,
    "lat" REAL,
    "lng" REAL,
    "scheduledDate" DATETIME NOT NULL,
    "scheduledSlot" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "mpPaymentId" TEXT,
    "notes" TEXT,
    "customerId" TEXT,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "createdAt", "customerEmail", "customerName", "customerPhone", "deliveryType", "id", "lat", "lng", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "shippingCost", "status", "total", "updatedAt") SELECT "address", "createdAt", "customerEmail", "customerName", "customerPhone", "deliveryType", "id", "lat", "lng", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "shippingCost", "status", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Barrio_name_key" ON "Barrio"("name");

