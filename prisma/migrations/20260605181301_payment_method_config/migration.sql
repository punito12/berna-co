-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "efectivoDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "transferenciaDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "aliasMercadoPago" TEXT NOT NULL DEFAULT '',
    "cbu" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

