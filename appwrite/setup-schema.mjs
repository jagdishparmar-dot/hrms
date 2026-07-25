/**
 * Idempotent schema setup from appwrite.config.json via Appwrite Admin API.
 * Preferred for Appwrite 1.7.x when CLI push hits encrypt recreate / stuck-attr races.
 *
 * Usage (from repo root):
 *   node appwrite/setup-schema.mjs
 *
 * Reads my-app/.env.local for endpoint, project, and APPWRITE_API_KEY.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(join(root, 'my-app', 'package.json'));
const { Client, Databases } = require('node-appwrite');
const config = JSON.parse(readFileSync(join(__dirname, 'appwrite.config.json'), 'utf8'));

function loadEnvLocal() {
  const path = join(root, 'my-app', '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT || config.endpoint;
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || config.projectId;
const apiKey = env.APPWRITE_API_KEY;

if (!apiKey) {
  console.error('APPWRITE_API_KEY missing in my-app/.env.local');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listAllAttributes(databaseId, collectionId) {
  // Default page size is 25; pass Query.limit via SDK (JSON query form).
  const { Query } = require('node-appwrite');
  const attrs = await databases.listAttributes(databaseId, collectionId, [
    Query.limit(100),
  ]);
  return attrs.attributes || [];
}

async function deleteAttributeAndWait(databaseId, collectionId, key) {
  try {
    await databases.deleteAttribute(databaseId, collectionId, key);
    console.log(`  attr deleted (stuck/failed): ${collectionId}.${key}`);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? Number(err.code) : 0;
    if (code !== 404) {
      console.log(`  attr delete skip ${collectionId}.${key}: ${err.message || err}`);
    }
  }
  for (let i = 0; i < 90; i++) {
    const attrs = await listAllAttributes(databaseId, collectionId);
    if (!attrs.some((a) => a.key === key)) return;
    await sleep(1000);
  }
  throw new Error(`Timeout deleting attribute ${key} on ${collectionId}`);
}

async function waitAttribute(databaseId, collectionId, key) {
  for (let i = 0; i < 180; i++) {
    try {
      const attrs = await listAllAttributes(databaseId, collectionId);
      const found = attrs.find((a) => a.key === key);
      if (found?.status === 'available') return;
      if (found?.status === 'failed' || found?.status === 'stuck') {
        await deleteAttributeAndWait(databaseId, collectionId, key);
        throw new Error(`RETRY_CREATE:${key}`);
      }
    } catch (err) {
      if (String(err.message || '').startsWith('RETRY_CREATE:')) throw err;
      if (String(err.message || '').includes('failed on')) throw err;
      // transient network — keep waiting
    }
    await sleep(1000);
  }
  throw new Error(`Timeout waiting for attribute ${key} on ${collectionId}`);
}

async function waitIndex(databaseId, collectionId, key) {
  for (let i = 0; i < 120; i++) {
    try {
      const idxs = await databases.listIndexes(databaseId, collectionId);
      const found = idxs.indexes.find((a) => a.key === key);
      if (found?.status === 'available') return;
      if (found?.status === 'failed') {
        throw new Error(`Index ${key} failed on ${collectionId}`);
      }
    } catch (err) {
      if (String(err.message || '').includes('failed on')) throw err;
    }
    await sleep(1000);
  }
  throw new Error(`Timeout waiting for index ${key} on ${collectionId}`);
}

async function ensureDatabase(db) {
  try {
    await databases.get(db.$id);
    console.log(`database exists: ${db.$id}`);
  } catch {
    await databases.create(db.$id, db.name, db.enabled ?? true);
    console.log(`database created: ${db.$id}`);
  }
}

async function ensureCollection(col) {
  const databaseId = col.databaseId;
  try {
    await databases.getCollection(databaseId, col.$id);
    console.log(`collection exists: ${col.$id}`);
  } catch {
    await databases.createCollection(
      databaseId,
      col.$id,
      col.name,
      col.$permissions || [],
      col.documentSecurity ?? true,
      col.enabled ?? true,
    );
    console.log(`collection created: ${col.$id}`);
  }

  for (const attr of col.attributes || []) {
    const defaultValue = attr.default == null ? undefined : attr.default;
    let existing = await listAllAttributes(databaseId, col.$id);
    let found = existing.find((a) => a.key === attr.key);
    if (found?.status === 'failed' || found?.status === 'stuck') {
      await deleteAttributeAndWait(databaseId, col.$id, attr.key);
      found = undefined;
    }
    if (found?.status === 'available' || found?.status === 'processing') {
      if (found.status === 'processing') {
        await waitAttribute(databaseId, col.$id, attr.key);
      } else if (attr.format === 'enum' || attr.type === 'enum') {
        const existingElements = found.elements || [];
        const configElements = attr.elements || [];
        const same =
          existingElements.length === configElements.length &&
          existingElements.every((element, index) => element === configElements[index]);
        if (!same) {
          await databases.updateEnumAttribute(
            databaseId,
            col.$id,
            attr.key,
            configElements,
            attr.required,
            defaultValue ?? null,
          );
          console.log(`  attr enum updated: ${col.$id}.${attr.key}`);
          await waitAttribute(databaseId, col.$id, attr.key);
        } else {
          console.log(`  attr exists: ${col.$id}.${attr.key}`);
        }
      } else {
        console.log(`  attr exists: ${col.$id}.${attr.key}`);
      }
      continue;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attr.format === 'enum' || attr.type === 'enum') {
          await databases.createEnumAttribute(
            databaseId,
            col.$id,
            attr.key,
            attr.elements,
            attr.required,
            defaultValue,
            attr.array ?? false,
          );
        } else if (attr.format === 'email' || attr.type === 'email') {
          await databases.createEmailAttribute(
            databaseId,
            col.$id,
            attr.key,
            attr.required,
            defaultValue,
            attr.array ?? false,
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            databaseId,
            col.$id,
            attr.key,
            attr.required,
            attr.min ?? undefined,
            attr.max ?? undefined,
            defaultValue,
            attr.array ?? false,
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            databaseId,
            col.$id,
            attr.key,
            attr.required,
            defaultValue,
            attr.array ?? false,
          );
        } else if (attr.type === 'float' || attr.type === 'double') {
          await databases.createFloatAttribute(
            databaseId,
            col.$id,
            attr.key,
            attr.required,
            attr.min ?? undefined,
            attr.max ?? undefined,
            defaultValue,
            attr.array ?? false,
          );
        } else {
          await databases.createStringAttribute(
            databaseId,
            col.$id,
            attr.key,
            attr.size || 255,
            attr.required,
            defaultValue,
            attr.array ?? false,
            attr.encrypt ?? false,
          );
        }
        console.log(`  attr created: ${col.$id}.${attr.key}`);
        await waitAttribute(databaseId, col.$id, attr.key);
        break;
      } catch (err) {
        const msg = String(err.message || err);
        const code = err && typeof err === 'object' && 'code' in err ? Number(err.code) : 0;
        if (msg.startsWith('RETRY_CREATE:') && attempt === 0) {
          continue;
        }
        if (code === 409) {
          console.log(`  attr race/exists: ${col.$id}.${attr.key}`);
          await waitAttribute(databaseId, col.$id, attr.key);
          break;
        }
        throw err;
      }
    }
  }

  for (const index of col.indexes || []) {
    const existing = await databases.listIndexes(databaseId, col.$id);
    if (existing.indexes.some((i) => i.key === index.key)) {
      console.log(`  index exists: ${col.$id}.${index.key}`);
      continue;
    }
    await databases.createIndex(
      databaseId,
      col.$id,
      index.key,
      index.type,
      index.attributes,
      index.orders,
    );
    console.log(`  index created: ${col.$id}.${index.key}`);
    await waitIndex(databaseId, col.$id, index.key);
  }
}

async function main() {
  console.log(`Pushing schema to ${endpoint} / ${projectId}`);
  for (const db of config.databases || []) {
    await ensureDatabase(db);
  }
  for (const col of config.collections || []) {
    await ensureCollection(col);
  }
  console.log('\nDone. Collection IDs match appwrite.config.json ($id values).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
