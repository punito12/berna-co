import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

type TablePlan = {
  table: string;
  delegate: string;
  booleans?: string[];
  dates?: string[];
};

const TABLES: TablePlan[] = [
  {
    table: "PricingConfig",
    delegate: "pricingConfig",
    dates: ["updatedAt"],
  },
  {
    table: "PaymentMethodConfig",
    delegate: "paymentMethodConfig",
    dates: ["updatedAt"],
  },
  {
    table: "AvailableDeliveryDay",
    delegate: "availableDeliveryDay",
    booleans: ["available"],
  },
  {
    table: "DeliverySlot",
    delegate: "deliverySlot",
    booleans: ["available"],
  },
  {
    table: "Zone",
    delegate: "zone",
    booleans: ["active"],
    dates: ["createdAt", "updatedAt"],
  },
  {
    table: "Barrio",
    delegate: "barrio",
    dates: ["createdAt", "updatedAt"],
  },
  {
    table: "Supplier",
    delegate: "supplier",
    dates: ["createdAt", "updatedAt"],
  },
  {
    table: "DiscountCode",
    delegate: "discountCode",
    booleans: ["active"],
    dates: ["expiresAt", "createdAt", "updatedAt"],
  },
  {
    table: "QuantityDiscount",
    delegate: "quantityDiscount",
    booleans: ["active"],
    dates: ["createdAt", "updatedAt"],
  },
  {
    table: "Subscriber",
    delegate: "subscriber",
    dates: ["createdAt"],
  },
  {
    table: "SiteContent",
    delegate: "siteContent",
    dates: ["publishedAt", "updatedAt"],
  },
  {
    table: "SiteText",
    delegate: "siteText",
    dates: ["updatedAt"],
  },
  {
    table: "SiteImage",
    delegate: "siteImage",
    dates: ["updatedAt"],
  },
  {
    table: "SiteSection",
    delegate: "siteSection",
    booleans: ["visible", "visibleDraft"],
    dates: ["updatedAt"],
  },
  {
    table: "SiteVersion",
    delegate: "siteVersion",
    dates: ["publishedAt"],
  },
  {
    table: "Product",
    delegate: "product",
    booleans: ["available", "isNew"],
    dates: ["createdAt", "updatedAt"],
  },
  {
    table: "CompetitorPrice",
    delegate: "competitorPrice",
    dates: ["updatedAt", "createdAt"],
  },
  {
    table: "Customer",
    delegate: "customer",
    dates: ["createdAt", "updatedAt"],
  },
  {
    table: "Order",
    delegate: "order",
    dates: ["createdAt", "updatedAt", "scheduledDate", "dueDate"],
  },
  {
    table: "OrderItem",
    delegate: "orderItem",
  },
  {
    table: "ManualSale",
    delegate: "manualSale",
    dates: ["soldAt", "dueDate", "createdAt", "updatedAt"],
  },
  {
    table: "SaleItem",
    delegate: "saleItem",
  },
  {
    table: "Purchase",
    delegate: "purchase",
    dates: ["date", "dueDate", "createdAt", "updatedAt"],
  },
  {
    table: "PurchaseItem",
    delegate: "purchaseItem",
  },
  {
    table: "Payment",
    delegate: "payment",
    dates: ["date", "createdAt"],
  },
  {
    table: "SupplierPayment",
    delegate: "supplierPayment",
    dates: ["date", "createdAt"],
  },
  {
    table: "CashMovement",
    delegate: "cashMovement",
    dates: ["date", "accrualDate", "createdAt", "updatedAt"],
  },
  {
    table: "StockMovement",
    delegate: "stockMovement",
    dates: ["date", "createdAt"],
  },
  {
    table: "CostSheet",
    delegate: "costSheet",
    dates: ["fecha", "createdAt", "updatedAt"],
  },
  {
    table: "CostHistory",
    delegate: "costHistory",
    dates: ["changedAt"],
  },
  {
    table: "PriceHistory",
    delegate: "priceHistory",
    dates: ["changedAt"],
  },
];

type Delegate = {
  count: () => Promise<number>;
  createMany: (args: { data: Record<string, unknown>[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
};

function usage(): never {
  throw new Error(
    [
      "Uso seguro:",
      "  SOURCE_SQLITE_PATH=prisma/dev.db TARGET_DATABASE_URL=postgresql://... npm run migrate:sqlite-to-postgres -- --dry-run",
      "",
      "Import real en staging, no produccion:",
      "  CONFIRM_SQLITE_TO_POSTGRES_IMPORT=YES SOURCE_SQLITE_PATH=prisma/dev.db TARGET_DATABASE_URL=postgresql://... npm run migrate:sqlite-to-postgres -- --execute",
    ].join("\n")
  );
}

function argEnabled(name: string): boolean {
  return process.argv.includes(name);
}

function currentPrismaProvider(): string {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const match = schema.match(/provider\s*=\s*"([^"]+)"/);
  return match?.[1] ?? "";
}

function sqliteJson<T>(dbPath: string, sql: string): T[] {
  const output = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 200,
  }).trim();
  return output ? (JSON.parse(output) as T[]) : [];
}

function quoteSqliteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function countSourceRows(dbPath: string, table: string): number {
  const rows = sqliteJson<{ count: number }>(
    dbPath,
    `SELECT COUNT(*) as count FROM ${quoteSqliteIdentifier(table)};`
  );
  return Number(rows[0]?.count ?? 0);
}

function readSourceRows(
  dbPath: string,
  plan: TablePlan
): Record<string, unknown>[] {
  const rows = sqliteJson<Record<string, unknown>>(
    dbPath,
    `SELECT * FROM ${quoteSqliteIdentifier(plan.table)};`
  );
  return rows.map((row) => normalizeRow(row, plan));
}

function normalizeRow(
  row: Record<string, unknown>,
  plan: TablePlan
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...row };

  for (const field of plan.booleans ?? []) {
    if (field in normalized && normalized[field] !== null) {
      normalized[field] = Boolean(normalized[field]);
    }
  }

  for (const field of plan.dates ?? []) {
    const value = normalized[field];
    if (typeof value === "string" || typeof value === "number") {
      normalized[field] = new Date(value);
    }
  }

  return normalized;
}

function targetDelegate(prisma: PrismaClient, name: string): Delegate {
  const delegate = (prisma as unknown as Record<string, Delegate>)[name];
  if (!delegate) {
    throw new Error(`No existe el delegate Prisma "${name}".`);
  }
  return delegate;
}

async function assertTargetIsEmpty(prisma: PrismaClient) {
  const nonEmpty: string[] = [];
  for (const plan of TABLES) {
    const count = await targetDelegate(prisma, plan.delegate).count();
    if (count > 0) nonEmpty.push(`${plan.table}=${count}`);
  }

  if (nonEmpty.length > 0) {
    throw new Error(
      [
        "El target Postgres no esta vacio. Por seguridad no se importa.",
        `Tablas con datos: ${nonEmpty.join(", ")}`,
        "Usa una DB Neon staging vacia o revisa manualmente antes de continuar.",
      ].join("\n")
    );
  }
}

async function main() {
  const dryRun = argEnabled("--dry-run");
  const execute = argEnabled("--execute");
  if (dryRun === execute) usage();

  const sourcePath = process.env.SOURCE_SQLITE_PATH;
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sourcePath || !targetUrl) usage();
  if (!existsSync(sourcePath)) {
    throw new Error(`No existe SOURCE_SQLITE_PATH: ${sourcePath}`);
  }
  if (targetUrl.includes("prod") || targetUrl.includes("production")) {
    throw new Error(
      "TARGET_DATABASE_URL parece ser produccion. Usa staging para esta fase."
    );
  }

  const sourceCounts = new Map<string, number>();
  for (const plan of TABLES) {
    sourceCounts.set(plan.table, countSourceRows(sourcePath, plan.table));
  }

  console.log("SQLite source:", sourcePath);
  console.log("Target Postgres:", targetUrl.replace(/:\/\/.*@/, "://***@"));
  console.log("Tablas planificadas:");
  for (const plan of TABLES) {
    console.log(`- ${plan.table}: ${sourceCounts.get(plan.table) ?? 0}`);
  }

  if (dryRun) {
    console.log("Dry-run: no se escribio en Postgres.");
    return;
  }

  if (process.env.CONFIRM_SQLITE_TO_POSTGRES_IMPORT !== "YES") {
    throw new Error(
      "Falta CONFIRM_SQLITE_TO_POSTGRES_IMPORT=YES para ejecutar el import."
    );
  }

  if (currentPrismaProvider() !== "postgresql") {
    throw new Error(
      [
        "El schema Prisma actual no esta en provider postgresql.",
        "Antes de ejecutar el import real, cambia el provider en una rama/fase aprobada,",
        "aplica la baseline Postgres en Neon staging y corre npx prisma generate.",
      ].join("\n")
    );
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
  });

  try {
    await assertTargetIsEmpty(prisma);

    for (const plan of TABLES) {
      const rows = readSourceRows(sourcePath, plan);
      if (rows.length === 0) {
        console.log(`Import ${plan.table}: 0`);
        continue;
      }
      const result = await targetDelegate(prisma, plan.delegate).createMany({
        data: rows,
        skipDuplicates: true,
      });
      console.log(`Import ${plan.table}: ${result.count}/${rows.length}`);
    }

    console.log("Verificacion de conteos:");
    for (const plan of TABLES) {
      const source = sourceCounts.get(plan.table) ?? 0;
      const target = await targetDelegate(prisma, plan.delegate).count();
      const status = source === target ? "OK" : "DIFERENCIA";
      console.log(`- ${plan.table}: source=${source} target=${target} ${status}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
