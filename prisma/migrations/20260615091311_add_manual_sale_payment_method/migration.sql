-- Medio de pago de la venta manual (lo elige el admin al cargarla). Aditiva con
-- default EFECTIVO → las ventas existentes quedan como efectivo. Sin reescribir
-- la tabla ni perder datos.
ALTER TABLE "ManualSale"
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'EFECTIVO';
