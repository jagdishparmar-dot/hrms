/**
 * Wipe hr_portal then apply appwrite.config.json via REST (no node-appwrite SDK).
 * Destructive — data loss is expected.
 *
 *   node appwrite/recreate-schema.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const config = JSON.parse(
  readFileSync(join(__dirname, "appwrite.config.json"), "utf8"),
);

function loadEnvLocal() {
  const text = readFileSync(join(root, "my-app", ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const endpoint = (
  env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  config.endpoint
).replace(/\/$/, "");
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || config.projectId;
const apiKey = env.APPWRITE_API_KEY;
if (!apiKey) {
  console.error("APPWRITE_API_KEY missing in my-app/.env.local");
  process.exit(1);
}

const headers = {
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
  "Content-Type": "application/json",
  "X-Appwrite-Response-Format": "1.6.0",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function qLimit(n) {
  return encodeURIComponent(JSON.stringify({ method: "limit", values: [n] }));
}

async function listAttributes(databaseId, collectionId) {
  // Default page size is 25 — employees has 36+ attrs. SDK Query uses JSON form.
  const listed = await api(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/attributes?queries[]=${qLimit(100)}`,
  );
  return listed.attributes || [];
}

async function listIndexes(databaseId, collectionId) {
  const listed = await api(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/indexes?queries[]=${qLimit(100)}`,
  );
  return listed.indexes || [];
}

async function api(method, path, body) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && data.message
        ? data.message
        : String(text).slice(0, 300);
    const err = new Error(`${res.status} ${method} ${path}: ${msg}`);
    err.status = res.status;
    err.code = data?.code ?? res.status;
    throw err;
  }
  return data;
}

async function wipe() {
  for (const db of config.databases || []) {
    const databaseId = db.$id;
    console.log(`Wiping database ${databaseId} ...`);

    let collections = [];
    try {
      const listed = await api("GET", `/databases/${databaseId}/collections`);
      collections = listed.collections || [];
    } catch (err) {
      if (err.status === 404) {
        console.log("  database missing");
        continue;
      }
      throw err;
    }

    for (const col of collections) {
      console.log(`  delete collection ${col.$id}`);
      try {
        await api("DELETE", `/databases/${databaseId}/collections/${col.$id}`);
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    await sleep(3000);
    console.log(`  delete database ${databaseId}`);
    try {
      await api("DELETE", `/databases/${databaseId}`);
    } catch (err) {
      if (err.status !== 404) throw err;
    }
    await sleep(3000);
  }
}

async function waitAttr(databaseId, collectionId, key) {
  for (let i = 0; i < 90; i++) {
    const attrs = await listAttributes(databaseId, collectionId);
    const found = attrs.find((a) => a.key === key);
    const status = found?.status || "missing";
    if (i > 0 && i % 10 === 0) {
      console.log(`    waiting ${collectionId}.${key} status=${status} (${i}s)`);
    }
    if (found?.status === "available") return;
    if (
      found?.status === "failed" ||
      found?.status === "stuck" ||
      (found?.status === "processing" && i >= 45)
    ) {
      console.log(
        `    ${collectionId}.${key} ${status} — deleting and retrying`,
      );
      try {
        await api(
          "DELETE",
          `/databases/${databaseId}/collections/${collectionId}/attributes/${key}`,
        );
      } catch {
        /* ignore */
      }
      for (let j = 0; j < 30; j++) {
        const again = await listAttributes(databaseId, collectionId);
        if (!again.some((a) => a.key === key)) break;
        await sleep(1000);
      }
      throw new Error(`RETRY:${key}`);
    }
    await sleep(1000);
  }
  throw new Error(`Timeout attribute ${collectionId}.${key}`);
}

async function waitIndex(databaseId, collectionId, key) {
  for (let i = 0; i < 180; i++) {
    const indexes = await listIndexes(databaseId, collectionId);
    const found = indexes.find((a) => a.key === key);
    if (found?.status === "available") return;
    if (found?.status === "failed") {
      throw new Error(`Index failed ${collectionId}.${key}`);
    }
    await sleep(1000);
  }
  throw new Error(`Timeout index ${collectionId}.${key}`);
}

function attrPath(databaseId, collectionId, attr) {
  if (attr.format === "enum" || attr.type === "enum") {
    return [
      `/databases/${databaseId}/collections/${collectionId}/attributes/enum`,
      {
        key: attr.key,
        elements: attr.elements,
        required: !!attr.required,
        default: attr.default ?? undefined,
        array: !!attr.array,
      },
    ];
  }
  if (attr.format === "email" || attr.type === "email") {
    return [
      `/databases/${databaseId}/collections/${collectionId}/attributes/email`,
      {
        key: attr.key,
        required: !!attr.required,
        default: attr.default ?? undefined,
        array: !!attr.array,
      },
    ];
  }
  if (attr.type === "integer") {
    return [
      `/databases/${databaseId}/collections/${collectionId}/attributes/integer`,
      {
        key: attr.key,
        required: !!attr.required,
        min: attr.min ?? undefined,
        max: attr.max ?? undefined,
        default: attr.default ?? undefined,
        array: !!attr.array,
      },
    ];
  }
  if (attr.type === "boolean") {
    return [
      `/databases/${databaseId}/collections/${collectionId}/attributes/boolean`,
      {
        key: attr.key,
        required: !!attr.required,
        default: attr.default ?? undefined,
        array: !!attr.array,
      },
    ];
  }
  if (attr.type === "float" || attr.type === "double") {
    return [
      `/databases/${databaseId}/collections/${collectionId}/attributes/float`,
      {
        key: attr.key,
        required: !!attr.required,
        min: attr.min ?? undefined,
        max: attr.max ?? undefined,
        default: attr.default ?? undefined,
        array: !!attr.array,
      },
    ];
  }
  return [
    `/databases/${databaseId}/collections/${collectionId}/attributes/string`,
    {
      key: attr.key,
      size: attr.size || 255,
      required: !!attr.required,
      default: attr.default ?? undefined,
      array: !!attr.array,
      encrypt: !!attr.encrypt,
    },
  ];
}

function cleanBody(body) {
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function ensureDatabase(db) {
  try {
    await api("GET", `/databases/${db.$id}`);
    console.log(`database exists: ${db.$id}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    await api("POST", "/databases", {
      databaseId: db.$id,
      name: db.name,
      enabled: db.enabled ?? true,
    });
    console.log(`database created: ${db.$id}`);
  }
}

async function ensureCollection(col) {
  const databaseId = col.databaseId;
  try {
    await api("GET", `/databases/${databaseId}/collections/${col.$id}`);
    console.log(`collection exists: ${col.$id}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    await api("POST", `/databases/${databaseId}/collections`, {
      collectionId: col.$id,
      name: col.name,
      permissions: col.$permissions || [],
      documentSecurity: col.documentSecurity ?? true,
      enabled: col.enabled ?? true,
    });
    console.log(`collection created: ${col.$id}`);
  }

  for (const attr of col.attributes || []) {
    const listed = await listAttributes(databaseId, col.$id);
    const found = listed.find((a) => a.key === attr.key);
    if (found?.status === "available") {
      console.log(`  attr exists: ${col.$id}.${attr.key}`);
      continue;
    }
    if (found?.status === "failed" || found?.status === "stuck") {
      await api(
        "DELETE",
        `/databases/${databaseId}/collections/${col.$id}/attributes/${attr.key}`,
      );
      for (let i = 0; i < 60; i++) {
        const again = await listAttributes(databaseId, col.$id);
        if (!again.some((a) => a.key === attr.key)) break;
        await sleep(1000);
      }
    } else if (found) {
      await waitAttr(databaseId, col.$id, attr.key);
      continue;
    }

    const [path, body] = attrPath(databaseId, col.$id, attr);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await api("POST", path, cleanBody(body));
        console.log(
          `  attr created: ${col.$id}.${attr.key}` +
            (attr.size ? ` (size=${attr.size})` : ""),
        );
        await waitAttr(databaseId, col.$id, attr.key);
        await sleep(300);
        break;
      } catch (err) {
        if (String(err.message).startsWith("RETRY:") && attempt === 0) continue;
        if (err.status === 409) {
          console.log(`  attr race/exists: ${col.$id}.${attr.key}`);
          await waitAttr(databaseId, col.$id, attr.key);
          break;
        }
        throw err;
      }
    }
  }

  for (const index of col.indexes || []) {
    const listed = await listIndexes(databaseId, col.$id);
    if (listed.some((i) => i.key === index.key)) {
      console.log(`  index exists: ${col.$id}.${index.key}`);
      continue;
    }
    await api("POST", `/databases/${databaseId}/collections/${col.$id}/indexes`, {
      key: index.key,
      type: index.type,
      attributes: index.attributes,
      orders: index.orders,
    });
    console.log(`  index created: ${col.$id}.${index.key}`);
    await waitIndex(databaseId, col.$id, index.key);
  }
}

async function apply() {
  for (const db of config.databases || []) {
    await ensureDatabase(db);
  }
  for (const col of config.collections || []) {
    await ensureCollection(col);
  }
}

async function main() {
  console.log(`Recreate schema on ${endpoint} / ${projectId}`);
  await wipe();
  console.log("\nApplying appwrite.config.json ...\n");
  await apply();
  console.log("\nSchema recreated from appwrite.config.json.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
