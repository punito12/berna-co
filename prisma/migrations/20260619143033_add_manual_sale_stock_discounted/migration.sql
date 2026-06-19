-- ¿La venta manual descontó stock al cargarse? Aditiva con default true → las
-- ventas existentes quedan como "descontó stock" (comportamiento histórico).
-- Sin reescribir la tabla ni perder datos.

ALTER TABLE "ManualSale"
ADD COLUMN IF NOT EXISTS "stockDiscounted" BOOLEAN NOT NULL DEFAULT true;
