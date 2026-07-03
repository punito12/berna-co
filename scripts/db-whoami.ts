import fs from "node:fs";
import path from "node:path";

type EnvMap = Record<string, string>;

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) return {};

  const env: EnvMap = {};
  const contents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    const first = value.charAt(0);
    const last = value.charAt(value.length - 1);
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadLocalEnv(): EnvMap {
  const cwd = process.cwd();
  const env: EnvMap = {
    ...parseEnvFile(path.join(cwd, ".env")),
    ...parseEnvFile(path.join(cwd, ".env.local")),
  };

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  return env;
}

function sanitizeHost(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return ["<branch>", ...parts.slice(1)].join(".");
}

function main() {
  const env = loadLocalEnv();
  const appEnv = env.APP_ENV || "(no definido)";
  const branchLabel = env.DATABASE_BRANCH || "(no definido)";
  const rawUrl = env.DATABASE_URL;

  console.log("DB whoami");
  console.log(`APP_ENV: ${appEnv}`);
  console.log(`DATABASE_BRANCH: ${branchLabel}`);

  if (!rawUrl) {
    console.log("DATABASE_URL: no definida");
    console.log("Advertencia: no se puede verificar la DB activa.");
    process.exitCode = 1;
    return;
  }

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname;
    const databaseName = url.pathname.replace(/^\//, "") || "(sin nombre)";
    const pooler = hostname.includes("pooler") ? "sí" : "no";
    const sslmode = url.searchParams.get("sslmode") === "require" ? "sí" : "no";

    console.log(`Host: ${sanitizeHost(hostname)}`);
    console.log(`Database: ${databaseName}`);
    console.log(`Pooler: ${pooler}`);
    console.log(`sslmode=require: ${sslmode}`);

    const appEnvLower = appEnv.toLowerCase();
    const branchLower = branchLabel.toLowerCase();

    if (appEnvLower !== "development") {
      console.log("Advertencia: APP_ENV no es development. Frená antes de correr migraciones o pruebas destructivas.");
    }

    if (branchLower !== "dev") {
      console.log("Advertencia: DATABASE_BRANCH no dice dev. Confirmá la DB activa antes de operar.");
    }
  } catch {
    console.log("DATABASE_URL: inválida o no parseable");
    process.exitCode = 1;
  }
}

main();
