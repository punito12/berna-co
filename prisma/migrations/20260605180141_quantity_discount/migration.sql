-- CreateTable
CREATE TABLE "QuantityDiscount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minKg" REAL NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

