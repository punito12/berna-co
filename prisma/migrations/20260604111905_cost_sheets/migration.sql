-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Recipe";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RecipeIngredient";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CostSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "breadcrumbType" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "compraKg" REAL NOT NULL DEFAULT 0,
    "compraPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "limpioKg" REAL NOT NULL DEFAULT 0,
    "huevosCantidad" INTEGER NOT NULL DEFAULT 0,
    "huevosPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "integralKg" REAL NOT NULL DEFAULT 0,
    "integralPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "tradicionalKg" REAL NOT NULL DEFAULT 0,
    "tradicionalPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "marinadaCantidad" REAL NOT NULL DEFAULT 0,
    "marinadaPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "prodFinalKg" REAL NOT NULL DEFAULT 0,
    "bolsaCantidad" INTEGER NOT NULL DEFAULT 0,
    "bolsaPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "etiquetaCantidad" INTEGER NOT NULL DEFAULT 0,
    "etiquetaPrecioUnit" INTEGER NOT NULL DEFAULT 0,
    "sueldoPercent" INTEGER NOT NULL DEFAULT 15,
    "utilidadesPercent" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostSheet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CostSheet_productId_breadcrumbType_idx" ON "CostSheet"("productId", "breadcrumbType");

