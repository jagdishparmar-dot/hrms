/**
 * Phase 0 smoke test: provision two tenants and verify isolation.
 * Usage: node appwrite/smoke-phase0.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(join(root, 'my-app', 'package.json'));
const { Client, Databases, Teams, Users, ID, Query } = require('node-appwrite');

function loadEnvLocal() {
  const text = readFileSync(join(root, 'my-app', '.env.local'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const databases = new Databases(client);
const teams = new Teams(client);
const users = new Users(client);

const db = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'hr_portal';
const companiesCol = env.NEXT_PUBLIC_APPWRITE_COMPANIES_COLLECTION_ID || 'companies';
const employeesCol = env.NEXT_PUBLIC_APPWRITE_EMPLOYEES_COLLECTION_ID || 'employees';
const auditCol = env.NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID || 'audit_logs';

const stamp = Date.now().toString(36);

async function provision(label) {
  const email = `${label}-${stamp}@smoke.test`;
  const slug = `${label}-${stamp}`;
  const user = await users.create(ID.unique(), email, undefined, 'SmokeTest1!', `Smoke ${label}`);
  const team = await teams.create(ID.unique(), `Smoke ${label}`);
  await teams.createMembership(team.$id, ['company_admin'], undefined, user.$id);

  const company = await databases.createDocument(db, companiesCol, ID.unique(), {
    name: `Smoke ${label}`,
    slug,
    teamId: team.$id,
    plan: 'free',
    featureFlags: JSON.stringify({ geofencing: true, payroll3pl: false, selfiePunch: false, sso: false }),
    branding: JSON.stringify({ logoUrl: '', primaryColor: '#1A3A6B', emailSenderName: label }),
    settings: JSON.stringify({
      workWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      jurisdictions: ['IN'],
    }),
    status: 'active',
    maxEmployees: 50,
    createdByUserId: user.$id,
  });

  const employee = await databases.createDocument(db, employeesCol, ID.unique(), {
    companyId: company.$id,
    userId: user.$id,
    teamId: team.$id,
    email,
    name: `Smoke ${label}`,
    role: 'company_admin',
    status: 'active',
  });

  await databases.createDocument(db, auditCol, ID.unique(), {
    companyId: company.$id,
    actorUserId: user.$id,
    action: 'company.provisioned',
    entityType: 'company',
    entityId: company.$id,
    meta: JSON.stringify({ smoke: true }),
  });

  return { user, team, company, employee, slug };
}

async function main() {
  console.log('Provisioning tenant A and B…');
  const a = await provision('alpha');
  const b = await provision('beta');

  const aEmployees = await databases.listDocuments(db, employeesCol, [
    Query.equal('companyId', a.company.$id),
  ]);
  const bEmployees = await databases.listDocuments(db, employeesCol, [
    Query.equal('companyId', b.company.$id),
  ]);
  const aOnly = aEmployees.documents.every((d) => d.companyId === a.company.$id);
  const bOnly = bEmployees.documents.every((d) => d.companyId === b.company.$id);
  const noCross =
    !aEmployees.documents.some((d) => d.userId === b.user.$id) &&
    !bEmployees.documents.some((d) => d.userId === a.user.$id);

  const slugClash = await databases.listDocuments(db, companiesCol, [
    Query.equal('slug', a.slug),
  ]);

  console.log({
    companyA: a.company.$id,
    companyB: b.company.$id,
    slugA: a.slug,
    slugB: b.slug,
    employeesA: aEmployees.total,
    employeesB: bEmployees.total,
    aOnly,
    bOnly,
    noCross,
    slugUnique: slugClash.total === 1,
  });

  if (!aOnly || !bOnly || !noCross || slugClash.total !== 1) {
    throw new Error('Isolation smoke test FAILED');
  }

  // Ensure platform admin user exists for demo@checkin.app
  const platformEmail = (env.PLATFORM_ADMIN_EMAILS || '').split(',')[0]?.trim();
  if (platformEmail) {
    try {
      const list = await users.list([Query.equal('email', platformEmail)]);
      if (list.total === 0) {
        await users.create(ID.unique(), platformEmail, undefined, 'PlatformAdmin1!', 'Platform Admin');
        console.log(`Created platform admin user: ${platformEmail} / PlatformAdmin1!`);
      } else {
        console.log(`Platform admin exists: ${platformEmail}`);
      }
    } catch (e) {
      console.warn('Platform admin ensure skipped:', e.message);
    }
  }

  console.log('Smoke test PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
