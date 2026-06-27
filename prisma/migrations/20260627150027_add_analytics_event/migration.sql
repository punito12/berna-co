-- Tabla de eventos de analytics del ecommerce público (page views + funnel).
-- Nueva tabla, aditiva: no toca pedidos/ventas/stock/clientes existentes.
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "path" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "variantName" TEXT,
    "quantity" INTEGER,
    "value" INTEGER,
    "paymentMethod" TEXT,
    "deliveryMethod" TEXT,
    "locality" TEXT,
    "orderId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventName_idx" ON "AnalyticsEvent"("eventName");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_anonymousId_idx" ON "AnalyticsEvent"("anonymousId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_orderId_idx" ON "AnalyticsEvent"("orderId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_productId_idx" ON "AnalyticsEvent"("productId");
