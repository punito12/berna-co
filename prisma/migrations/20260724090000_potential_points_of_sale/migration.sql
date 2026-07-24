-- CreateTable
CREATE TABLE "ProspectZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CUSTOM',
    "tier" TEXT NOT NULL DEFAULT 'C',
    "polygon" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scanEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gridSpacingMeters" INTEGER NOT NULL DEFAULT 700,
    "searchRadiusMeters" INTEGER NOT NULL DEFAULT 500,
    "defaultRequestLimit" INTEGER NOT NULL DEFAULT 250,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSearchQuery" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GOOGLE',
    "mode" TEXT NOT NULL DEFAULT 'TEXT',
    "value" TEXT NOT NULL,
    "placeTypes" TEXT NOT NULL DEFAULT '[]',
    "categoryFamily" TEXT NOT NULL DEFAULT 'GENERAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectSearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectZoneQuery" (
    "zoneId" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,

    CONSTRAINT "ProspectZoneQuery_pkey" PRIMARY KEY ("zoneId","queryId")
);

-- CreateTable
CREATE TABLE "ProspectScoringConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "config" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectScan" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "querySnapshot" TEXT NOT NULL DEFAULT '[]',
    "includeActivityData" BOOLEAN NOT NULL DEFAULT true,
    "requestLimit" INTEGER NOT NULL,
    "resultLimitPerRequest" INTEGER NOT NULL DEFAULT 20,
    "estimatedRequests" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsdCents" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successfulRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "newProspects" INTEGER NOT NULL DEFAULT 0,
    "updatedProspects" INTEGER NOT NULL DEFAULT 0,
    "duplicatesDetected" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT NOT NULL DEFAULT '[]',
    "lockToken" TEXT,
    "lockExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectScanCell" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "queryId" TEXT,
    "key" TEXT NOT NULL,
    "pointIndex" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "querySnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectScanCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectStore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "neighborhood" TEXT,
    "locality" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Argentina',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zoneId" TEXT,
    "discoveryScanId" TEXT,
    "googlePlaceId" TEXT,
    "googleMapsUrl" TEXT,
    "categoryKey" TEXT NOT NULL,
    "rawCategories" TEXT NOT NULL DEFAULT '[]',
    "detectedKeywords" TEXT NOT NULL DEFAULT '[]',
    "operatingStatus" TEXT,
    "permanentlyClosed" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT NOT NULL DEFAULT '[]',
    "scoreExplanation" TEXT NOT NULL DEFAULT '',
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "ambiguousClassification" BOOLEAN NOT NULL DEFAULT false,
    "classificationSource" TEXT NOT NULL DEFAULT 'RULES',
    "classificationConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT NOT NULL DEFAULT '',
    "manualCategory" TEXT,
    "manualScore" INTEGER,
    "manualScoreReason" TEXT,
    "existingClientCandidateId" TEXT,
    "linkedCustomerId" TEXT,
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSource" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "externalId" TEXT,
    "listingUrl" TEXT,
    "rawCategory" TEXT,
    "rawData" TEXT NOT NULL DEFAULT '{}',
    "scanId" TEXT,
    "cellId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectStatusHistory" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectDuplicateCandidate" (
    "id" TEXT NOT NULL,
    "firstId" TEXT NOT NULL,
    "secondId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "similarity" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProspectDuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProspectZone_tier_idx" ON "ProspectZone"("tier");

-- CreateIndex
CREATE INDEX "ProspectZone_active_scanEnabled_idx" ON "ProspectZone"("active", "scanEnabled");

-- CreateIndex
CREATE INDEX "ProspectSearchQuery_provider_active_idx" ON "ProspectSearchQuery"("provider", "active");

-- CreateIndex
CREATE INDEX "ProspectSearchQuery_sortOrder_idx" ON "ProspectSearchQuery"("sortOrder");

-- CreateIndex
CREATE INDEX "ProspectZoneQuery_queryId_idx" ON "ProspectZoneQuery"("queryId");

-- CreateIndex
CREATE INDEX "ProspectScan_status_createdAt_idx" ON "ProspectScan"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectScan_zoneId_createdAt_idx" ON "ProspectScan"("zoneId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectScan_lockExpiresAt_idx" ON "ProspectScan"("lockExpiresAt");

-- CreateIndex
CREATE INDEX "ProspectScanCell_scanId_status_pointIndex_idx" ON "ProspectScanCell"("scanId", "status", "pointIndex");

-- CreateIndex
CREATE INDEX "ProspectScanCell_nextAttemptAt_idx" ON "ProspectScanCell"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectScanCell_scanId_key_key" ON "ProspectScanCell"("scanId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectStore_googlePlaceId_key" ON "ProspectStore"("googlePlaceId");

-- CreateIndex
CREATE INDEX "ProspectStore_score_idx" ON "ProspectStore"("score");

-- CreateIndex
CREATE INDEX "ProspectStore_status_idx" ON "ProspectStore"("status");

-- CreateIndex
CREATE INDEX "ProspectStore_categoryKey_idx" ON "ProspectStore"("categoryKey");

-- CreateIndex
CREATE INDEX "ProspectStore_province_locality_idx" ON "ProspectStore"("province", "locality");

-- CreateIndex
CREATE INDEX "ProspectStore_zoneId_idx" ON "ProspectStore"("zoneId");

-- CreateIndex
CREATE INDEX "ProspectStore_firstDiscoveredAt_idx" ON "ProspectStore"("firstDiscoveredAt");

-- CreateIndex
CREATE INDEX "ProspectStore_normalizedName_normalizedAddress_idx" ON "ProspectStore"("normalizedName", "normalizedAddress");

-- CreateIndex
CREATE INDEX "ProspectStore_latitude_longitude_idx" ON "ProspectStore"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ProspectStore_existingClientCandidateId_idx" ON "ProspectStore"("existingClientCandidateId");

-- CreateIndex
CREATE INDEX "ProspectStore_linkedCustomerId_idx" ON "ProspectStore"("linkedCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectSource_sourceFingerprint_key" ON "ProspectSource"("sourceFingerprint");

-- CreateIndex
CREATE INDEX "ProspectSource_prospectId_idx" ON "ProspectSource"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectSource_provider_externalId_idx" ON "ProspectSource"("provider", "externalId");

-- CreateIndex
CREATE INDEX "ProspectSource_scanId_idx" ON "ProspectSource"("scanId");

-- CreateIndex
CREATE INDEX "ProspectSource_cellId_idx" ON "ProspectSource"("cellId");

-- CreateIndex
CREATE INDEX "ProspectStatusHistory_prospectId_createdAt_idx" ON "ProspectStatusHistory"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectDuplicateCandidate_status_similarity_idx" ON "ProspectDuplicateCandidate"("status", "similarity");

-- CreateIndex
CREATE INDEX "ProspectDuplicateCandidate_secondId_idx" ON "ProspectDuplicateCandidate"("secondId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectDuplicateCandidate_firstId_secondId_key" ON "ProspectDuplicateCandidate"("firstId", "secondId");

-- AddForeignKey
ALTER TABLE "ProspectZoneQuery" ADD CONSTRAINT "ProspectZoneQuery_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ProspectZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectZoneQuery" ADD CONSTRAINT "ProspectZoneQuery_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProspectSearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectScan" ADD CONSTRAINT "ProspectScan_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ProspectZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectScanCell" ADD CONSTRAINT "ProspectScanCell_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "ProspectScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectScanCell" ADD CONSTRAINT "ProspectScanCell_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProspectSearchQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectStore" ADD CONSTRAINT "ProspectStore_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ProspectZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectStore" ADD CONSTRAINT "ProspectStore_discoveryScanId_fkey" FOREIGN KEY ("discoveryScanId") REFERENCES "ProspectScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectStore" ADD CONSTRAINT "ProspectStore_linkedCustomerId_fkey" FOREIGN KEY ("linkedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSource" ADD CONSTRAINT "ProspectSource_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "ProspectStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSource" ADD CONSTRAINT "ProspectSource_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "ProspectScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSource" ADD CONSTRAINT "ProspectSource_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "ProspectScanCell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectStatusHistory" ADD CONSTRAINT "ProspectStatusHistory_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "ProspectStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectDuplicateCandidate" ADD CONSTRAINT "ProspectDuplicateCandidate_firstId_fkey" FOREIGN KEY ("firstId") REFERENCES "ProspectStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectDuplicateCandidate" ADD CONSTRAINT "ProspectDuplicateCandidate_secondId_fkey" FOREIGN KEY ("secondId") REFERENCES "ProspectStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defaults editables del módulo. No inicia scans ni llama APIs.
INSERT INTO "ProspectScoringConfig" ("id", "config", "updatedAt")
VALUES ('singleton', '{}', CURRENT_TIMESTAMP);

INSERT INTO "ProspectSearchQuery"
  ("id", "label", "provider", "mode", "value", "placeTypes", "categoryFamily", "active", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('psq-type-retail', 'Tipos Google: comercios de alimentos', 'GOOGLE', 'TYPE', 'comercios de alimentos', '["grocery_store","supermarket","market","food_store","general_store","convenience_store","health_food_store","butcher_shop","farmers_market"]', 'GENERAL', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-almacen', 'Almacén', 'GOOGLE', 'TEXT', 'almacén', '[]', 'GENERAL', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-autoservicio', 'Autoservicio', 'GOOGLE', 'TEXT', 'autoservicio', '[]', 'GENERAL', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-despensa', 'Despensa', 'GOOGLE', 'TEXT', 'despensa', '[]', 'GENERAL', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-market', 'Market', 'GOOGLE', 'TEXT', 'market', '[]', 'GENERAL', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-minimercado', 'Minimercado', 'GOOGLE', 'TEXT', 'minimercado', '[]', 'GENERAL', true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-supermercado', 'Supermercado', 'GOOGLE', 'TEXT', 'supermercado', '[]', 'GENERAL', true, 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-super-independiente', 'Supermercado independiente', 'GOOGLE', 'TEXT', 'supermercado independiente', '[]', 'GENERAL', true, 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-mercado-gourmet', 'Mercado gourmet', 'GOOGLE', 'TEXT', 'mercado gourmet', '[]', 'PREMIUM', true, 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-almacen-gourmet', 'Almacén gourmet', 'GOOGLE', 'TEXT', 'almacén gourmet', '[]', 'PREMIUM', true, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-alimentos-premium', 'Alimentos premium', 'GOOGLE', 'TEXT', 'alimentos premium', '[]', 'PREMIUM', true, 110, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-congelados', 'Tienda de congelados', 'GOOGLE', 'TEXT', 'tienda de congelados', '[]', 'CONGELADOS', true, 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-productos-congelados', 'Productos congelados', 'GOOGLE', 'TEXT', 'productos congelados', '[]', 'CONGELADOS', true, 130, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-dietetica', 'Dietética', 'GOOGLE', 'TEXT', 'dietética', '[]', 'NATURAL', true, 140, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-almacen-natural', 'Almacén natural', 'GOOGLE', 'TEXT', 'almacén natural', '[]', 'NATURAL', true, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-mercado-natural', 'Mercado natural', 'GOOGLE', 'TEXT', 'mercado natural', '[]', 'NATURAL', true, 160, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-organicos', 'Productos orgánicos', 'GOOGLE', 'TEXT', 'productos orgánicos', '[]', 'NATURAL', true, 170, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-saludable', 'Tienda saludable', 'GOOGLE', 'TEXT', 'tienda saludable', '[]', 'NATURAL', true, 180, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-fiambreria', 'Fiambrería', 'GOOGLE', 'TEXT', 'fiambrería', '[]', 'ESPECIALIZADO', true, 190, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-delicatessen', 'Delicatessen', 'GOOGLE', 'TEXT', 'delicatessen', '[]', 'PREMIUM', true, 200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-sin-tacc', 'Tienda sin TACC', 'GOOGLE', 'TEXT', 'tienda sin TACC', '[]', 'ESPECIALIZADO', true, 210, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-vegana', 'Tienda vegana', 'GOOGLE', 'TEXT', 'tienda vegana', '[]', 'ESPECIALIZADO', true, 220, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-carniceria-premium', 'Carnicería premium', 'GOOGLE', 'TEXT', 'carnicería premium', '[]', 'PREMIUM', true, 230, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psq-text-regionales', 'Productos regionales', 'GOOGLE', 'TEXT', 'productos regionales', '[]', 'ESPECIALIZADO', true, 240, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Polígono chico meramente ilustrativo para el primer test. Queda con scans
-- deshabilitados: el operador debe revisar el contorno y habilitarlo.
INSERT INTO "ProspectZone"
  ("id", "name", "kind", "tier", "polygon", "active", "scanEnabled", "gridSpacingMeters", "searchRadiusMeters", "defaultRequestLimit", "notes", "createdAt", "updatedAt")
VALUES
  ('prospect-zone-nordelta-example', 'Nordelta (ejemplo editable)', 'CUSTOM', 'A', '{"type":"Polygon","coordinates":[[[-58.6595,-34.4245],[-58.6425,-34.4245],[-58.6425,-34.412],[-58.6595,-34.412],[-58.6595,-34.4245]]]}', true, false, 550, 450, 120, 'Contorno ilustrativo. Revisar vértices y habilitar scans antes de usar.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "ProspectZoneQuery" ("zoneId", "queryId")
VALUES
  ('prospect-zone-nordelta-example', 'psq-type-retail'),
  ('prospect-zone-nordelta-example', 'psq-text-almacen'),
  ('prospect-zone-nordelta-example', 'psq-text-autoservicio'),
  ('prospect-zone-nordelta-example', 'psq-text-minimercado'),
  ('prospect-zone-nordelta-example', 'psq-text-supermercado'),
  ('prospect-zone-nordelta-example', 'psq-text-mercado-gourmet'),
  ('prospect-zone-nordelta-example', 'psq-text-congelados'),
  ('prospect-zone-nordelta-example', 'psq-text-dietetica'),
  ('prospect-zone-nordelta-example', 'psq-text-fiambreria'),
  ('prospect-zone-nordelta-example', 'psq-text-carniceria-premium');
