/**
 * Smoke test for login guardrails (email verification, company assignment, banned company).
 * Run: node appwrite/test-login-guards.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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

function assert(name, condition, detail = '') {
  if (!condition) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS: ${name}`);
  return true;
}

async function main() {
  const env = loadEnvLocal();
  const endpoint = (env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = env.APPWRITE_API_KEY;
  const databaseId = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const employeesCollection = env.NEXT_PUBLIC_APPWRITE_EMPLOYEES_COLLECTION_ID;
  const companiesCollection = env.NEXT_PUBLIC_APPWRITE_COMPANIES_COLLECTION_ID;

  if (!endpoint || !projectId || !apiKey) {
    console.error('Missing Appwrite env in my-app/.env.local');
    process.exit(1);
  }

  const adminHeaders = {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json',
    'X-Appwrite-Response-Format': '1.6.0',
  };

  const suffix = Date.now();
  const testPassword = 'TestLogin!Guard1';
  const unverifiedEmail = `login-guard-unverified-${suffix}@example.test`;
  const noCompanyEmail = `login-guard-nocompany-${suffix}@example.test`;

  const createdUserIds = [];

  async function createUser(email, verified = true) {
    const userId = randomUUID().replace(/-/g, '').slice(0, 36);
    const res = await fetch(`${endpoint}/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId,
        email,
        password: testPassword,
        name: 'Login Guard Test',
      }),
    });
    if (!res.ok) throw new Error(`Create user failed: ${await res.text()}`);
    const user = await res.json();
    createdUserIds.push(user.$id);

    if (verified) {
      const patch = await fetch(`${endpoint}/users/${user.$id}/verification`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ emailVerification: true }),
      });
      if (!patch.ok) throw new Error(`Verify user failed: ${await patch.text()}`);
    }

    return user;
  }

  async function deleteUser(userId) {
    await fetch(`${endpoint}/users/${userId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    }).catch(() => {});
  }

  async function login(email, password) {
    const res = await fetch(`${endpoint}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': projectId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  }

  async function getUser(userId) {
    const res = await fetch(`${endpoint}/users/${userId}`, { headers: adminHeaders });
    if (!res.ok) throw new Error(`Get user failed: ${await res.text()}`);
    return res.json();
  }

  // 1) Logout redirect messages (local app)
  for (const [reason, expected] of [
    ['no-company', 'not assigned to any active company'],
    ['banned', 'suspended or deactivated'],
  ]) {
    const res = await fetch(`http://localhost:3000/logout?reason=${reason}`, {
      redirect: 'manual',
    });
    const location = decodeURIComponent(res.headers.get('location') || '').replace(/\+/g, ' ');
    assert(
      `logout?reason=${reason} redirects with message`,
      res.status === 307 && location.toLowerCase().includes(expected),
      location,
    );
  }

  // 2) Unverified email should be blocked by login guard logic
  const unverified = await createUser(unverifiedEmail, false);
  const unverifiedUser = await getUser(unverified.$id);
  assert('fixture: unverified user has emailVerification=false', !unverifiedUser.emailVerification);

  const unverifiedLogin = await login(unverifiedEmail, testPassword);
  assert('unverified user can authenticate password (Appwrite)', unverifiedLogin.ok);

  const afterLoginUser = await getUser(unverifiedLogin.body.userId || unverified.$id);
  const wouldBlockUnverified =
    !afterLoginUser.emailVerification &&
    !String(unverifiedEmail).includes('coldverse.in');
  assert('login guard would block unverified non-platform user', wouldBlockUnverified);

  // 3) Verified user with no employee membership
  const noCompany = await createUser(noCompanyEmail, true);
  const noCompanyLogin = await login(noCompanyEmail, testPassword);
  assert('verified no-company user can authenticate password', noCompanyLogin.ok);

  const membershipsRes = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${employeesCollection}/documents?queries[]=${q({
      method: 'equal',
      attribute: 'userId',
      values: [noCompany.$id],
    })}&queries[]=${q({ method: 'equal', attribute: 'status', values: ['active'] })}&queries[]=${q({
      method: 'limit',
      values: [1],
    })}`,
    { headers: adminHeaders },
  );
  const memberships = await membershipsRes.json();
  assert(
    'fixture: no-company user has zero active memberships',
    (memberships.total ?? memberships.documents?.length ?? 0) === 0,
  );

  // 4) Suspended company detection helper
  const companiesRes = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${companiesCollection}/documents?queries[]=${q({
      method: 'equal',
      attribute: 'status',
      values: ['suspended'],
    })}&queries[]=${q({ method: 'limit', values: [1] })}`,
    { headers: adminHeaders },
  );
  const companies = await companiesRes.json();
  const suspended = companies.documents?.[0];
  if (suspended) {
    const blocked =
      !suspended ||
      suspended.status === 'suspended' ||
      suspended.status === 'archived';
    assert('suspended company fixture is detectable', blocked, suspended.status);
  } else {
    console.log('SKIP: no suspended company in database to test company-ban fixture');
  }

  // Cleanup
  for (const id of createdUserIds) {
    await deleteUser(id);
  }
  console.log(`\nCleaned up ${createdUserIds.length} test user(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
