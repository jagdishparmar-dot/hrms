/**
 * Idempotent Appwrite Storage bucket setup from appwrite.config.json buckets[].
 *
 * Usage: node appwrite/setup-storage.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(join(root, 'my-app', 'package.json'));
const { Client, Storage } = require('node-appwrite');
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
const storage = new Storage(client);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureBucket(bucket) {
  try {
    await storage.getBucket(bucket.$id);
    console.log(`bucket exists: ${bucket.$id}`);
  } catch {
    await storage.createBucket(
      bucket.$id,
      bucket.name,
      bucket.$permissions || [],
      bucket.fileSecurity ?? true,
      bucket.enabled ?? true,
      bucket.maximumFileSize ?? 10485760,
      bucket.allowedFileExtensions ?? [],
      bucket.compression ?? 'none',
      bucket.encryption ?? false,
      bucket.antivirus ?? false,
    );
    console.log(`bucket created: ${bucket.$id}`);
    await sleep(1500);
  }
}

async function main() {
  console.log(`Pushing storage buckets to ${endpoint} / ${projectId}`);
  for (const bucket of config.buckets || []) {
    await ensureBucket(bucket);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
