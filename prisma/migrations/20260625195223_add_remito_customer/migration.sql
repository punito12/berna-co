-- Vínculo opcional Remito → Customer (registro de clientes). Aditivo y nullable:
-- los remitos existentes quedan sin cliente vinculado (customerName intacto) y
-- se pueden vincular después. ON DELETE SET NULL para no romper historial si se
-- borra un cliente.

ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Remito_customerId_fkey'
  ) THEN
    ALTER TABLE "Remito"
    ADD CONSTRAINT "Remito_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
