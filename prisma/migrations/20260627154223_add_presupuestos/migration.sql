-- Presupuestos: documentos comerciales (cotizaciones). Tablas NUEVAS, aditivas:
-- no tocan remitos/pedidos/ventas/stock/caja. FK a Customer con SET NULL.
CREATE TABLE IF NOT EXISTS "Presupuesto" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LISTA_MAYORISTA',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "notesInternal" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PresupuestoItem" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "productId" TEXT,
    "breadcrumbType" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT NOT NULL DEFAULT '',
    "listPrice" INTEGER NOT NULL,
    "wholesalePrice" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresupuestoItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Presupuesto_number_key" ON "Presupuesto"("number");
CREATE INDEX IF NOT EXISTS "Presupuesto_date_idx" ON "Presupuesto"("date");
CREATE INDEX IF NOT EXISTS "Presupuesto_status_idx" ON "Presupuesto"("status");
CREATE INDEX IF NOT EXISTS "Presupuesto_customerId_idx" ON "Presupuesto"("customerId");
CREATE INDEX IF NOT EXISTS "PresupuestoItem_presupuestoId_idx" ON "PresupuestoItem"("presupuestoId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Presupuesto_customerId_fkey') THEN
    ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresupuestoItem_presupuestoId_fkey') THEN
    ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_presupuestoId_fkey"
      FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
