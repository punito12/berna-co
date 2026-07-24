-- AlterTable
ALTER TABLE "ProspectScan" ADD COLUMN     "detailRequestCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedDetailRequests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedMaxCostUsdCents" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "includeActivityData" SET DEFAULT false;

-- Discovery no vuelve a ejecutar campos Enterprise en scans todavía pendientes.
UPDATE "ProspectScan"
SET "includeActivityData" = false
WHERE "status" IN ('PENDING', 'PAUSED', 'LIMIT_REACHED', 'PARTIAL_FAILED');

-- AlterTable
ALTER TABLE "ProspectScanCell" ADD COLUMN     "detailRequestCount" INTEGER NOT NULL DEFAULT 0;
