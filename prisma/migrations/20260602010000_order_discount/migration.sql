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
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "mpPaymentId" TEXT,
    "notes" TEXT,
    "customerId" TEXT,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "deliveryType", "id", "lat", "lng", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "shippingCost", "status", "total", "updatedAt") SELECT "address", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "deliveryType", "id", "lat", "lng", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "shippingCost", "status", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

