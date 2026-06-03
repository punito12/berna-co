-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "notes" TEXT,
    "orderId" TEXT,
    "saleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ManualSale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ManualSale" ("channel", "createdAt", "customerId", "customerName", "discountAmount", "discountPct", "gross", "id", "neighborhood", "net", "notes", "soldAt", "updatedAt") SELECT "channel", "createdAt", "customerId", "customerName", "discountAmount", "discountPct", "gross", "id", "neighborhood", "net", "notes", "soldAt", "updatedAt" FROM "ManualSale";
DROP TABLE "ManualSale";
ALTER TABLE "new_ManualSale" RENAME TO "ManualSale";
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
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "dueDate" DATETIME,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "deliveryType", "discountAmount", "discountCode", "id", "lat", "lng", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "shippingCost", "status", "total", "updatedAt") SELECT "address", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "deliveryType", "discountAmount", "discountCode", "id", "lat", "lng", "mpPaymentId", "notes", "paymentMethod", "scheduledDate", "scheduledSlot", "shippingCost", "status", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_saleId_idx" ON "Payment"("saleId");

