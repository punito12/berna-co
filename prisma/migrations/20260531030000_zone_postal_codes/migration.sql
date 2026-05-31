-- AlterTable
ALTER TABLE "Order" ADD COLUMN "postalCode" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "postalCodes" TEXT NOT NULL DEFAULT '[]',
    "localities" TEXT NOT NULL DEFAULT '[]',
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Zone" ("active", "createdAt", "daysOfWeek", "id", "localities", "name", "updatedAt") SELECT "active", "createdAt", "daysOfWeek", "id", "localities", "name", "updatedAt" FROM "Zone";
DROP TABLE "Zone";
ALTER TABLE "new_Zone" RENAME TO "Zone";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

