-- Separate checkout scheduling for delivery and pickup, and add digital remitos.
-- Existing schedule rows are kept as DELIVERY via the column defaults.

ALTER TABLE "DeliverySlot"
ADD COLUMN IF NOT EXISTS "scheduleType" TEXT NOT NULL DEFAULT 'DELIVERY';

ALTER TABLE "AvailableDeliveryDay"
ADD COLUMN IF NOT EXISTS "scheduleType" TEXT NOT NULL DEFAULT 'DELIVERY';

DROP INDEX IF EXISTS "AvailableDeliveryDay_dayOfWeek_key";

CREATE UNIQUE INDEX IF NOT EXISTS "AvailableDeliveryDay_scheduleType_dayOfWeek_key"
ON "AvailableDeliveryDay"("scheduleType", "dayOfWeek");

CREATE INDEX IF NOT EXISTS "DeliverySlot_scheduleType_idx"
ON "DeliverySlot"("scheduleType");

CREATE INDEX IF NOT EXISTS "AvailableDeliveryDay_scheduleType_idx"
ON "AvailableDeliveryDay"("scheduleType");

ALTER TABLE "Order"
ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS "Remito" (
  "id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "customerName" TEXT NOT NULL,
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "receivedSignature" TEXT NOT NULL DEFAULT '',
  "receivedClarification" TEXT NOT NULL DEFAULT '',
  "receivedDate" TIMESTAMP(3),
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Remito_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RemitoItem" (
  "id" TEXT NOT NULL,
  "remitoId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'kg',
  "description" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "RemitoItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Remito_number_key"
ON "Remito"("number");

CREATE INDEX IF NOT EXISTS "Remito_date_idx"
ON "Remito"("date");

CREATE INDEX IF NOT EXISTS "Remito_archived_idx"
ON "Remito"("archived");

CREATE INDEX IF NOT EXISTS "RemitoItem_remitoId_idx"
ON "RemitoItem"("remitoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RemitoItem_remitoId_fkey'
  ) THEN
    ALTER TABLE "RemitoItem"
    ADD CONSTRAINT "RemitoItem_remitoId_fkey"
    FOREIGN KEY ("remitoId") REFERENCES "Remito"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
