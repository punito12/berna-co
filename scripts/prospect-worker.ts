import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

async function main() {
  const { processNextProspectScanBatch } = await import(
    "@/lib/prospect-scans"
  );
  const maxBatches = Math.max(1, Math.min(1_000, Number(process.argv[2] ?? 1)));
  for (let index = 0; index < maxBatches; index += 1) {
    const result = await processNextProspectScanBatch();
    console.log(JSON.stringify(result));
    if (result.status === "IDLE") break;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
