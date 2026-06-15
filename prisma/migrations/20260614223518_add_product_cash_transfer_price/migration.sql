-- Precio efectivo/transferencia por producto (precio base/real). El precio web
-- existente (`price`/`prices`) queda como precio online. Estas columnas son
-- aditivas con default 0/"{}" → "no cargado", y la lógica cae al precio web
-- como fallback, así nada cambia hasta que el admin cargue el precio efectivo.

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "priceCashTransfer" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "pricesCashTransfer" TEXT NOT NULL DEFAULT '{}';
