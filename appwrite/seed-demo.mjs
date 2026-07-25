/**
 * Seed demo tenants + volume data (REST, no node-appwrite SDK).
 *
 *   node appwrite/seed-demo.mjs --reset
 *   node appwrite/seed-demo.mjs --reset --employees=40 --days=45
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const text = readFileSync(join(root, "my-app", ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function parseArgs(argv) {
  const out = { employees: 40, days: 45, reset: false };
  for (const arg of argv) {
    if (arg === "--reset") out.reset = true;
    const emp = arg.match(/^--employees=(\d+)$/);
    if (emp) out.employees = Math.max(5, Math.min(200, Number(emp[1])));
    const days = arg.match(/^--days=(\d+)$/);
    if (days) out.days = Math.max(5, Math.min(90, Number(days[1])));
  }
  return out;
}

const env = loadEnvLocal();
const args = parseArgs(process.argv.slice(2));
const endpoint = (env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(/\/$/, "");
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = env.APPWRITE_API_KEY;
if (!endpoint || !projectId || !apiKey) {
  console.error("Missing Appwrite env in my-app/.env.local");
  process.exit(1);
}

const db = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "hr_portal";
const C = {
  companies: "companies",
  employees: "employees",
  audit: "audit_logs",
  sites: "sites",
  attendance: "attendance_records",
  regs: "attendance_regularizations",
  leaveTypes: "leave_types",
  leaveBalances: "leave_balances",
  leaveRequests: "leave_requests",
  holidays: "holidays",
  salary: "salary_structures",
  payrollRuns: "payroll_runs",
  payslips: "payslips",
};

const DEMO_PASSWORD = "DemoPass1!";
const PLATFORM_EMAIL = "demo@checkin.app";
const PLATFORM_PASSWORD = "PlatformAdmin1!";

const headers = {
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
  "Content-Type": "application/json",
  "X-Appwrite-Response-Format": "1.6.0",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function q(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}
function qEqual(attribute, value) {
  return q({
    method: "equal",
    attribute,
    values: Array.isArray(value) ? value : [value],
  });
}
function qLimit(n) {
  return q({ method: "limit", values: [n] });
}
function qOffset(n) {
  return q({ method: "offset", values: [n] });
}

async function api(method, path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
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
        // retry transient
        if ((res.status === 429 || res.status >= 500) && attempt < 3) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw err;
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      if (attempt < 3) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

function teamPerms(teamId) {
  return [
    `read("team:${teamId}")`,
    `update("team:${teamId}/company_admin")`,
    `delete("team:${teamId}/company_admin")`,
  ];
}

function uniqueId() {
  return `seed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function weekdayShort(d) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}
function isWeekend(d) {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}
function panFor(i) {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `${L[i % 26]}${L[(i * 3) % 26]}${L[(i * 7) % 26]}${L[(i * 11) % 26]}${L[(i * 13) % 26]}${String(1000 + (i % 9000)).slice(0, 4)}${L[(i * 17) % 26]}`;
}

const FIRST = [
  "Aarav", "Diya", "Rohan", "Ananya", "Kabir", "Isha", "Vikram", "Meera",
  "Arjun", "Sneha", "Rahul", "Pooja", "Karan", "Nisha", "Amit", "Priya",
];
const LAST = [
  "Sharma", "Patel", "Singh", "Reddy", "Iyer", "Nair", "Gupta", "Das",
  "Joshi", "Mehta", "Khan", "Chopra", "Verma", "Rao",
];
const DEPTS = [
  ["Operations", "Site Supervisor"],
  ["Operations", "Field Executive"],
  ["HR", "HR Executive"],
  ["Finance", "Payroll Analyst"],
  ["Logistics", "Warehouse Associate"],
  ["IT", "Support Engineer"],
  ["Sales", "Account Executive"],
];

async function listDocs(collectionId, equals = {}) {
  const docs = [];
  let offset = 0;
  for (;;) {
    const parts = Object.entries(equals).map(([k, v]) => `queries[]=${qEqual(k, v)}`);
    parts.push(`queries[]=${qLimit(100)}`, `queries[]=${qOffset(offset)}`);
    const page = await api(
      "GET",
      `/databases/${db}/collections/${collectionId}/documents?${parts.join("&")}`,
    );
    docs.push(...(page.documents || []));
    if ((page.documents || []).length < 100) break;
    offset += 100;
  }
  return docs;
}

async function findUserByEmail(email) {
  const qs = [`queries[]=${qEqual("email", email)}`, `queries[]=${qLimit(1)}`].join("&");
  const listed = await api("GET", `/users?${qs}`);
  return (listed.users || [])[0] || null;
}

async function ensureUser(email, name, password) {
  const existing = await findUserByEmail(email);
  if (existing) {
    try {
      await api("PATCH", `/users/${existing.$id}/password`, { password });
    } catch {
      /* ignore */
    }
    try {
      await api("PATCH", `/users/${existing.$id}/name`, { name });
    } catch {
      /* ignore */
    }
    return existing;
  }
  return api("POST", "/users", {
    userId: uniqueId(),
    email,
    password,
    name,
  });
}

async function deleteCompanyBySlug(slug) {
  const found = await listDocs(C.companies, { slug });
  if (!found.length) return;
  const company = found[0];
  console.log(`  resetting ${slug} (${company.$id}) ...`);

  for (const col of [
    C.payslips, C.payrollRuns, C.salary, C.leaveRequests, C.leaveBalances,
    C.leaveTypes, C.holidays, C.regs, C.attendance, C.sites, C.audit, C.employees,
  ]) {
    const docs = await listDocs(col, { companyId: company.$id });
    for (const doc of docs) {
      try {
        await api("DELETE", `/databases/${db}/collections/${col}/documents/${doc.$id}`);
      } catch {
        /* continue */
      }
    }
    if (docs.length) console.log(`    deleted ${docs.length} ${col}`);
  }

  const emps = await listDocs(C.employees, { companyId: company.$id });
  for (const emp of emps) {
    if (String(emp.email).toLowerCase() === PLATFORM_EMAIL) continue;
    try {
      await api("DELETE", `/users/${emp.userId}`);
    } catch {
      /* ignore */
    }
  }

  try {
    await api("DELETE", `/databases/${db}/collections/${C.companies}/documents/${company.$id}`);
  } catch {
    /* ignore */
  }
  try {
    await api("DELETE", `/teams/${company.teamId}`);
  } catch {
    /* ignore */
  }
}

async function createDoc(collectionId, data, permissions) {
  return api("POST", `/databases/${db}/collections/${collectionId}/documents`, {
    documentId: uniqueId(),
    data,
    permissions,
  });
}

async function createEmployee({
  companyId, teamId, userId, email, name, role, code, employmentType,
  department, designation, primarySiteId, managerUserId, mustChangePassword, index,
}) {
  return createDoc(
    C.employees,
    {
      companyId,
      userId,
      teamId,
      email,
      name,
      role,
      status: "active",
      employeeCode: code,
      employmentType,
      department,
      designation,
      reportingManagerUserId: managerUserId || "",
      dateOfJoining: "2024-04-01",
      grade: index % 3 === 0 ? "L2" : "L1",
      costCenter: `CC-${(index % 5) + 1}`,
      phone: `98${String(10000000 + index).slice(0, 8)}`,
      dateOfBirth: `199${index % 10}-0${(index % 9) + 1}-15`,
      gender: index % 2 === 0 ? "Male" : "Female",
      bloodGroup: ["A+", "B+", "O+", "AB+"][index % 4],
      currentCity: index % 2 === 0 ? "Bengaluru" : "Hyderabad",
      currentState: index % 2 === 0 ? "KA" : "TS",
      emergencyContactName: "Emergency Contact",
      emergencyContactPhone: "9900000000",
      panNumber: panFor(index),
      aadhaarNumber: String(200000000000 + index).slice(0, 12),
      uanNumber: String(100000000000 + index).slice(0, 12),
      esiNumber: String(5000000000 + index).slice(0, 10),
      pfAccountNumber: `KN/BNG/${10000 + index}`,
      bankName: "HDFC Bank",
      bankIfsc: "HDFC0001234".slice(0, 11),
      bankAccountNumber: String(50100000000000 + index),
      primarySiteId: primarySiteId || "",
      alternateSiteIds: "[]",
      workShiftStart: "09:00",
      workShiftEnd: "18:00",
      mustChangePassword: !!mustChangePassword,
    },
    teamPerms(teamId),
  );
}

async function seedCompany({
  name, slug, plan, maxEmployees, employeeCount, attendanceDays, sitesSpec,
}) {
  console.log(`\nSeeding company: ${name} (${slug})`);
  const permsTeamPlaceholder = []; // filled after team create

  const hrEmail = `hr@${slug}.test`;
  const hrName = `${name} HR Admin`;
  const hrUser = await ensureUser(hrEmail, hrName, DEMO_PASSWORD);

  const team = await api("POST", "/teams", {
    teamId: uniqueId(),
    name,
  });
  await api("POST", `/teams/${team.$id}/memberships`, {
    roles: ["company_admin"],
    userId: hrUser.$id,
  });
  const perms = teamPerms(team.$id);

  const company = await createDoc(
    C.companies,
    {
      name,
      slug,
      teamId: team.$id,
      plan,
      featureFlags: JSON.stringify({
        geofencing: true, payroll3pl: false, selfiePunch: false, sso: false,
      }),
      branding: JSON.stringify({
        logoUrl: "", primaryColor: "#1A3A6B", emailSenderName: name,
      }),
      settings: JSON.stringify({
        workWeek: ["mon", "tue", "wed", "thu", "fri"],
        timezone: "Asia/Kolkata",
        currency: "INR",
        jurisdictions: ["IN"],
        lateGraceMinutes: 15,
        payCycleDay: 1,
      }),
      status: "active",
      maxEmployees,
      createdByUserId: hrUser.$id,
    },
    perms,
  );

  const sites = [];
  for (const s of sitesSpec) {
    sites.push(
      await createDoc(
        C.sites,
        {
          companyId: company.$id,
          name: s.name,
          lat: s.lat,
          long: s.long,
          radiusMeters: s.radiusMeters,
          address: s.address,
          status: "active",
        },
        perms,
      ),
    );
  }
  console.log(`  sites: ${sites.length}`);

  const employees = [];
  const hrEmp = await createEmployee({
    companyId: company.$id,
    teamId: team.$id,
    userId: hrUser.$id,
    email: hrEmail,
    name: hrName,
    role: "company_admin",
    code: "HR001",
    employmentType: "Permanent",
    department: "HR",
    designation: "HR Manager",
    primarySiteId: sites[0].$id,
    managerUserId: "",
    mustChangePassword: false,
    index: 0,
  });
  employees.push({ user: hrUser, emp: hrEmp, email: hrEmail });

  const mobileEmail = `emp1@${slug}.test`;
  const mobileUser = await ensureUser(mobileEmail, "Demo Mobile User", DEMO_PASSWORD);
  await api("POST", `/teams/${team.$id}/memberships`, {
    roles: ["employee"],
    userId: mobileUser.$id,
  });
  const mobileEmp = await createEmployee({
    companyId: company.$id,
    teamId: team.$id,
    userId: mobileUser.$id,
    email: mobileEmail,
    name: "Demo Mobile User",
    role: "employee",
    code: "EMP001",
    employmentType: "Permanent",
    department: "Operations",
    designation: "Field Executive",
    primarySiteId: sites[0].$id,
    managerUserId: hrUser.$id,
    mustChangePassword: false,
    index: 1,
  });
  employees.push({ user: mobileUser, emp: mobileEmp, email: mobileEmail });

  for (let i = 0; i < Math.max(0, employeeCount - 2); i++) {
    const n = i + 2;
    const fullName = `${FIRST[n % FIRST.length]} ${LAST[n % LAST.length]}`;
    const email = `emp${String(n).padStart(2, "0")}@${slug}.test`;
    const [department, designation] = DEPTS[n % DEPTS.length];
    const employmentType =
      n % 11 === 0 ? "3PL" : n % 13 === 0 ? "Intern" : n % 17 === 0 ? "Consultant" : "Permanent";
    const role = n % 19 === 0 ? "reporting_manager" : "employee";
    const site = sites[n % sites.length];

    const user = await ensureUser(email, fullName, DEMO_PASSWORD);
    await api("POST", `/teams/${team.$id}/memberships`, {
      roles: ["employee"],
      userId: user.$id,
    });
    const emp = await createEmployee({
      companyId: company.$id,
      teamId: team.$id,
      userId: user.$id,
      email,
      name: fullName,
      role,
      code: `EMP${String(n).padStart(3, "0")}`,
      employmentType,
      department,
      designation,
      primarySiteId: site.$id,
      managerUserId: hrUser.$id,
      mustChangePassword: n % 7 === 0,
      index: n,
    });
    employees.push({ user, emp, email });
    if ((i + 1) % 10 === 0) {
      console.log(`  employees: ${employees.length}/${employeeCount}`);
      await sleep(150);
    }
  }
  console.log(`  employees: ${employees.length}`);

  const year = new Date().getUTCFullYear();
  const leaveTypeDefs = [
    { name: "Casual Leave", code: "CL", paid: true, accrualPerMonth: 1, maxBalance: 12, carryForward: false },
    { name: "Sick Leave", code: "SL", paid: true, accrualPerMonth: 0.5, maxBalance: 6, carryForward: false },
    { name: "Earned Leave", code: "EL", paid: true, accrualPerMonth: 1.25, maxBalance: 30, carryForward: true },
  ];
  const leaveTypes = [];
  for (const lt of leaveTypeDefs) {
    leaveTypes.push(
      await createDoc(
        C.leaveTypes,
        { companyId: company.$id, status: "active", ...lt },
        perms,
      ),
    );
  }

  await createDoc(
    C.holidays,
    { companyId: company.$id, name: "Republic Day", date: `${year}-01-26`, region: "IN" },
    perms,
  );
  await createDoc(
    C.holidays,
    { companyId: company.$id, name: "Independence Day", date: `${year}-08-15`, region: "IN" },
    perms,
  );

  for (const row of employees) {
    for (const lt of leaveTypes) {
      await createDoc(
        C.leaveBalances,
        {
          companyId: company.$id,
          employeeId: row.emp.$id,
          leaveTypeId: lt.$id,
          year,
          balance: lt.code === "CL" ? 8 : lt.code === "SL" ? 4 : 12,
        },
        perms,
      );
    }
  }

  let leaveReqCount = 0;
  for (let i = 2; i < Math.min(employees.length, 12); i++) {
    const row = employees[i];
    const lt = leaveTypes[i % leaveTypes.length];
    const start = addDays(new Date(), 3 + i);
    const end = addDays(start, i % 2);
    const status = i % 3 === 0 ? "pending" : i % 3 === 1 ? "approved" : "rejected";
    await createDoc(
      C.leaveRequests,
      {
        companyId: company.$id,
        employeeId: row.emp.$id,
        userId: row.user.$id,
        leaveTypeId: lt.$id,
        fromDate: isoDate(start),
        toDate: isoDate(end),
        days: i % 2 === 0 ? 1 : 2,
        status,
        approverUserId: status === "pending" ? "" : hrUser.$id,
        note: "Demo leave request",
      },
      perms,
    );
    leaveReqCount += 1;
  }
  console.log(`  leave: ${leaveTypes.length} types, ${leaveReqCount} requests`);

  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  let attendanceCount = 0;

  for (let dayOffset = 1; dayOffset <= attendanceDays; dayOffset++) {
    const day = addDays(today, -dayOffset);
    if (isWeekend(day)) continue;
    const dateIso = isoDate(day);
    const dow = weekdayShort(day);

    for (let ei = 0; ei < employees.length; ei++) {
      if ((ei + dayOffset) % 13 === 0) continue;
      const row = employees[ei];
      const late = (ei + dayOffset) % 7 === 0;
      const site = sites[ei % sites.length];
      const inHour = late ? 9 : 8;
      const inMin = late ? 25 + (ei % 20) : 45 + (ei % 10);
      const outMin = ei % 30;
      const clockInTime = `${String(inHour).padStart(2, "0")}:${String(inMin).padStart(2, "0")}`;
      const clockOutTime = `18:${String(outMin).padStart(2, "0")}`;
      const inTs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), inHour, inMin);
      const outTs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 18, outMin);

      await createDoc(
        C.attendance,
        {
          companyId: company.$id,
          employeeId: row.emp.$id,
          userId: row.user.$id,
          dateIso,
          dayOfWeek: dow,
          formattedDate: dateIso,
          clockInTime,
          clockInTimestamp: inTs,
          clockOutTime,
          clockOutTimestamp: outTs,
          totalMinutes: Math.round((outTs - inTs) / 60000),
          status: late ? "LATE" : "PRESENT",
          siteId: site.$id,
          geofenceStatus: "INSIDE",
          distanceMeters: 12 + (ei % 40),
          punchInLat: site.lat + (ei % 5) * 0.00001,
          punchInLong: site.long + (ei % 5) * 0.00001,
          punchInAccuracy: 8,
          punchOutLat: site.lat,
          punchOutLong: site.long,
          punchOutAccuracy: 10,
          deviceId: `seed-device-${ei % 8}`,
          note: "",
          locationName: site.name,
        },
        perms,
      );
      attendanceCount += 1;
    }
    if (dayOffset % 10 === 0) {
      console.log(`  attendance: -${dayOffset}/${attendanceDays} days (docs=${attendanceCount})`);
      await sleep(100);
    }
  }
  console.log(`  attendance records: ${attendanceCount}`);

  for (let i = 2; i < Math.min(8, employees.length); i++) {
    const row = employees[i];
    await createDoc(
      C.regs,
      {
        companyId: company.$id,
        employeeId: row.emp.$id,
        userId: row.user.$id,
        dateIso: isoDate(addDays(today, -(i + 2))),
        requestedClockIn: "09:05",
        requestedClockOut: "18:00",
        reason: "Forgot to punch out (seed)",
        status: "pending",
        approverUserId: "",
        reviewNote: "",
      },
      perms,
    );
  }

  const permanent = employees.filter(
    (e) => e.emp.employmentType === "Permanent" || !e.emp.employmentType,
  );
  for (let i = 0; i < permanent.length; i++) {
    const row = permanent[i];
    const base = 25000 + (i % 10) * 2500;
    const hra = Math.round(base * 0.4);
    const special = 3000;
    await createDoc(
      C.salary,
      {
        companyId: company.$id,
        employeeId: row.emp.$id,
        effectiveFrom: `${year}-01-01`,
        components: JSON.stringify([
          { key: "basic", label: "Basic", type: "earning", amount: base },
          { key: "hra", label: "HRA", type: "earning", amount: hra },
          { key: "special", label: "Special Allowance", type: "earning", amount: special },
          { key: "pf", label: "PF", type: "deduction", amount: Math.round(base * 0.12) },
          { key: "pt", label: "Professional Tax", type: "deduction", amount: 200 },
        ]),
        ctcMonthly: base + hra + special,
        status: "active",
      },
      perms,
    );
  }
  console.log(`  salary structures: ${permanent.length}`);

  const prev = addDays(today, -30);
  const payrollMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  const run = await createDoc(
    C.payrollRuns,
    {
      companyId: company.$id,
      month: payrollMonth,
      status: "finalized",
      totals: JSON.stringify({ employees: 0, totalNet: 0, workingDays: 22 }),
      notes: "Seed payroll run",
    },
    perms,
  );

  let totalNet = 0;
  let slipCount = 0;
  for (const row of permanent) {
    const structures = await listDocs(C.salary, { employeeId: row.emp.$id });
    if (!structures.length) continue;
    const structure = structures[0];
    const components = JSON.parse(structure.components || "[]");
    const earnings = components.filter((c) => c.type === "earning").reduce((s, c) => s + c.amount, 0);
    const deductions = components.filter((c) => c.type === "deduction").reduce((s, c) => s + c.amount, 0);
    const payableDays = 20 + (slipCount % 3);
    const ratio = payableDays / 22;
    const netPay = Math.max(0, earnings * ratio - deductions * ratio);
    await createDoc(
      C.payslips,
      {
        companyId: company.$id,
        payrollRunId: run.$id,
        employeeId: row.emp.$id,
        breakdown: JSON.stringify({
          payableDays,
          workingDays: 22,
          presentDays: payableDays,
          leaveDays: 0,
          components,
          gross: earnings * ratio,
          deductions: deductions * ratio,
          netPay,
        }),
        fileId: "",
        netPay,
        month: payrollMonth,
      },
      perms,
    );
    totalNet += netPay;
    slipCount += 1;
  }

  await api("PATCH", `/databases/${db}/collections/${C.payrollRuns}/documents/${run.$id}`, {
    data: {
      totals: JSON.stringify({ employees: slipCount, totalNet, workingDays: 22 }),
    },
  });
  console.log(`  payroll ${payrollMonth}: ${slipCount} payslips`);

  await createDoc(
    C.audit,
    {
      companyId: company.$id,
      actorUserId: hrUser.$id,
      action: "seed.demo",
      entityType: "company",
      entityId: company.$id,
      meta: JSON.stringify({
        employees: employees.length,
        attendance: attendanceCount,
        payrollMonth,
      }),
    },
    perms,
  );

  void permsTeamPlaceholder;
  return {
    company,
    hrEmail,
    mobileEmail,
    employeeCount: employees.length,
    attendanceCount,
    payrollMonth,
    sites: sites.map((s) => ({ id: s.$id, name: s.name, lat: s.lat, long: s.long })),
  };
}

async function main() {
  console.log(`Demo seed → ${endpoint} / ${projectId}`);
  console.log(`employees≈${args.employees}, attendanceDays=${args.days}, reset=${args.reset}`);

  await ensureUser(PLATFORM_EMAIL, "Platform Admin", PLATFORM_PASSWORD);
  console.log(`platform admin ready: ${PLATFORM_EMAIL}`);

  if (args.reset) {
    await deleteCompanyBySlug("acme-demo");
    await deleteCompanyBySlug("beta-demo");
  } else {
    const existing = await listDocs(C.companies, { slug: "acme-demo" });
    if (existing.length) {
      console.error('\nSlug "acme-demo" exists. Re-run with --reset.');
      process.exit(1);
    }
  }

  const acme = await seedCompany({
    name: "Acme Logistics",
    slug: "acme-demo",
    plan: "pro",
    maxEmployees: 200,
    employeeCount: args.employees,
    attendanceDays: args.days,
    sitesSpec: [
      { name: "Bengaluru HQ", lat: 12.9716, long: 77.5946, radiusMeters: 200, address: "MG Road, Bengaluru" },
      { name: "Whitefield Warehouse", lat: 12.9698, long: 77.75, radiusMeters: 300, address: "Whitefield, Bengaluru" },
      { name: "Electronic City Hub", lat: 12.8399, long: 77.677, radiusMeters: 250, address: "Electronic City, Bengaluru" },
    ],
  });

  const beta = await seedCompany({
    name: "Beta Retail",
    slug: "beta-demo",
    plan: "free",
    maxEmployees: 50,
    employeeCount: Math.min(8, args.employees),
    attendanceDays: Math.min(14, args.days),
    sitesSpec: [
      { name: "Hyderabad Store", lat: 17.385, long: 78.4867, radiusMeters: 150, address: "Banjara Hills, Hyderabad" },
    ],
  });

  console.log("\n========== DEMO CREDENTIALS ==========");
  console.log(`Platform admin:  ${PLATFORM_EMAIL} / ${PLATFORM_PASSWORD}`);
  console.log(`Acme HR admin:   ${acme.hrEmail} / ${DEMO_PASSWORD}`);
  console.log(`Acme mobile emp: ${acme.mobileEmail} / ${DEMO_PASSWORD}`);
  console.log(`Beta HR admin:   ${beta.hrEmail} / ${DEMO_PASSWORD}`);
  console.log("Other seeded users password:", DEMO_PASSWORD);
  console.log("\nPunch geofence (Acme HQ):", acme.sites[0]);
  console.log(
    `Acme volume: ${acme.employeeCount} employees, ${acme.attendanceCount} attendance rows, payroll ${acme.payrollMonth}`,
  );
  console.log("Web: http://localhost:3000/login");
  console.log("======================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
