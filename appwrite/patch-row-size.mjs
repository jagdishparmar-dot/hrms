/**
 * Patch appwrite.config.json so optional string attrs use size 16384 (TEXT),
 * avoiding MariaDB ~8KB row-size stalls during attribute create.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "appwrite.config.json");
const cfg = JSON.parse(readFileSync(path, "utf8"));

/** Keys that stay compact (indexed / filters / short codes). */
const KEEP_COMPACT = new Set([
  "companyId",
  "userId",
  "teamId",
  "email",
  "name",
  "role",
  "status",
  "employeeCode",
  "employmentType",
  "slug",
  "plan",
  "primarySiteId",
  "siteId",
  "employeeId",
  "month",
  "year",
  "type",
  "key",
]);

let patched = 0;
for (const col of cfg.collections || []) {
  const indexed = new Set(
    (col.indexes || []).flatMap((i) => i.attributes || []),
  );
  for (const attr of col.attributes || []) {
    if (attr.type !== "string") continue;
    if (attr.format === "enum" || attr.format === "email") continue;
    if (KEEP_COMPACT.has(attr.key) || indexed.has(attr.key)) {
      // Cap compact strings so they cannot blow the row alone
      if (typeof attr.size === "number" && attr.size > 512) {
        attr.size = 512;
        patched++;
      }
      continue;
    }
    if (attr.size !== 16384) {
      attr.size = 16384;
      patched++;
    }
  }
}

writeFileSync(path, JSON.stringify(cfg, null, 4) + "\n");
writeFileSync(join(__dirname, "appwrite.json"), JSON.stringify(cfg, null, 4) + "\n");
console.log(`Patched ${patched} string sizes → 16384 (TEXT) / capped compact fields`);
