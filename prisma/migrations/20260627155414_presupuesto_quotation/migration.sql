-- Segundo tipo de presupuesto: COTIZACIÓN (tipo remito). Aditivo: agrega total
-- al doc + cantidad/precio/subtotal a los ítems, y cambia el default de type a
-- PRICE_LIST. No toca datos existentes (la sección recién se creó).
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Presupuesto" ALTER COLUMN "type" SET DEFAULT 'PRICE_LIST';

ALTER TABLE "PresupuestoItem" ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PresupuestoItem" ADD COLUMN IF NOT EXISTS "unitPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PresupuestoItem" ADD COLUMN IF NOT EXISTS "subtotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PresupuestoItem" ALTER COLUMN "listPrice" SET DEFAULT 0;
ALTER TABLE "PresupuestoItem" ALTER COLUMN "wholesalePrice" SET DEFAULT 0;
