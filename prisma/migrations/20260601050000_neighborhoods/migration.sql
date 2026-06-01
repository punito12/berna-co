-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "lot" TEXT;
ALTER TABLE "Customer" ADD COLUMN "neighborhood" TEXT;

-- AlterTable
ALTER TABLE "ManualSale" ADD COLUMN "neighborhood" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "neighborhood" TEXT;

