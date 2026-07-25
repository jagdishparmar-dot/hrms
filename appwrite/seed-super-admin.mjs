/**
 * Ensure the default Super Admin Auth user exists (REST, no SDK).
 *
 *   node appwrite/seed-super-admin.mjs
 *
 * Email: jagdish.parmar@coldverse.in (always)
 * Password: SUPER_ADMIN_PASSWORD from my-app/.env.local, or SuperAdmin!ChangeMe1
 *
 * Does not overwrite an existing user's password.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DEFAULT_SUPER_ADMIN_EMAIL = 'jagdish.parmar@coldverse.in';
const DEFAULT_PASSWORD = 'SuperAdmin!ChangeMe1';

function loadEnvLocal() {
  const text = readFileSync(join(root, 'my-app', '.env.local'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function q(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}

async function main() {
  const env = loadEnvLocal();
  const endpoint = (env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    console.error('Missing Appwrite env in my-app/.env.local');
    process.exit(1);
  }

  const password = env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const headers = {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json',
    'X-Appwrite-Response-Format': '1.6.0',
  };

  const listUrl = `${endpoint}/users?queries[]=${q({
    method: 'equal',
    attribute: 'email',
    values: [DEFAULT_SUPER_ADMIN_EMAIL],
  })}&queries[]=${q({ method: 'limit', values: [1] })}`;

  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    throw new Error(`List users failed: ${listRes.status} ${await listRes.text()}`);
  }
  const list = await listRes.json();
  const existing = list.users?.[0];

  if (existing) {
    console.log(
      `Super Admin already exists: ${DEFAULT_SUPER_ADMIN_EMAIL} (${existing.$id})`,
    );
    console.log('Password was NOT changed.');
  } else {
    const createRes = await fetch(`${endpoint}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: randomUUID().replace(/-/g, '').slice(0, 36),
        email: DEFAULT_SUPER_ADMIN_EMAIL,
        password,
        name: 'Jagdish Parmar',
      }),
    });
    if (!createRes.ok) {
      throw new Error(
        `Create user failed: ${createRes.status} ${await createRes.text()}`,
      );
    }
    const user = await createRes.json();
    console.log(
      `Created Super Admin: ${DEFAULT_SUPER_ADMIN_EMAIL} (${user.$id})`,
    );
    if (!env.SUPER_ADMIN_PASSWORD) {
      console.log(`Temporary password: ${password}`);
      console.log(
        'Set SUPER_ADMIN_PASSWORD in .env.local and rotate this password immediately.',
      );
    } else {
      console.log('Password set from SUPER_ADMIN_PASSWORD.');
    }
  }

  const emails = (env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.includes(DEFAULT_SUPER_ADMIN_EMAIL)) {
    console.log('');
    console.log('Add to my-app/.env.local (and Coolify):');
    console.log(
      `PLATFORM_ADMIN_EMAILS=${[...emails, DEFAULT_SUPER_ADMIN_EMAIL].join(',')}`,
    );
  } else {
    console.log('PLATFORM_ADMIN_EMAILS already includes the Super Admin email.');
  }

  console.log('');
  console.log(
    'Safeguards: app blocks delete/deactivate of this account via platform/tenant tooling.',
  );
  console.log(
    'App code always treats this email as a platform admin even if omitted from env.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
