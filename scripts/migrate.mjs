// Applies every db/migrations/*.sql file (in name order) to the database in
// DATABASE_URL. Idempotent — all statements use IF NOT EXISTS. Run with:
//
//   npm run db:migrate
//
// DATABASE_URL is read from your .env files (via @next/env), same as the app.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { neon } from "@neondatabase/serverless";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — nothing to migrate.");
  process.exit(1);
}

const sql = neon(url);
const dir = path.join(process.cwd(), "db", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const text = readFileSync(path.join(dir, file), "utf8");
  // Strip full-line `--` comments first, then run each statement separately
  // (the HTTP driver is one-statement-per-call).
  const statements = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`applied ${file} (${statements.length} statements)`);
}

console.log("Migrations complete.");
