-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "total" INTEGER NOT NULL,
    "mpPaymentId" TEXT,
    "notes" TEXT
);
INSERT INTO "new_Order" ("address", "createdAt", "customerEmail", "customerName", "customerPhone", "deliveryType", "id", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "status", "total", "updatedAt") SELECT "address", "createdAt", "customerEmail", "customerName", "customerPhone", "deliveryType", "id", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "status", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_Zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "polygon" TEXT,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Zone" ("active", "createdAt", "daysOfWeek", "id", "name", "updatedAt") SELECT "active", "createdAt", "daysOfWeek", "id", "name", "updatedAt" FROM "Zone";
DROP TABLE "Zone";
ALTER TABLE "new_Zone" RENAME TO "Zone";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

