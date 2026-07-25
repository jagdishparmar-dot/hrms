/**
 * Apply logical string sizes from a field map to appwrite.config.json + appwrite.json.
 * JSON/blob fields use 16385 so Appwrite stores TEXT (outside MariaDB row-size budget).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEXT = 16385; // >16384 → TEXT, does not count toward InnoDB row size

/** Logical sizes for known keys (used across collections). */
const SIZES = {
  // identity / refs
  companyId: 64,
  userId: 64,
  teamId: 64,
  employeeId: 64,
  siteId: 64,
  primarySiteId: 64,
  reportingManagerUserId: 64,
  createdByUserId: 64,
  approvedByUserId: 64,
  reviewedByUserId: 64,
  runId: 64,
  leaveTypeId: 64,
  requestId: 64,
  documentId: 64,
  fileId: 64,
  payslipId: 64,
  structureId: 64,
  regularizationId: 64,
  attendanceId: 64,
  holidayId: 64,

  // company
  name: 128,
  slug: 64,
  plan: 32,
  featureFlags: TEXT, // JSON
  branding: TEXT, // JSON
  settings: TEXT, // JSON

  // employee core
  employeeCode: 32,
  department: 64,
  designation: 64,
  dateOfJoining: 10,
  grade: 32,
  costCenter: 32,
  phone: 20,
  dateOfBirth: 10,
  gender: 16,
  bloodGroup: 8,
  currentCity: 64,
  currentState: 64,
  emergencyContactName: 128,
  emergencyContactPhone: 20,
  panNumber: 10,
  aadhaarNumber: 12,
  uanNumber: 12,
  esiNumber: 20,
  pfAccountNumber: 32,
  bankName: 64,
  bankIfsc: 11,
  bankAccountNumber: 34,
  alternateSiteIds: TEXT, // JSON array of site ids
  workShiftStart: 5,
  workShiftEnd: 5,

  // sites
  address: 256,
  city: 64,
  state: 64,
  country: 64,
  pincode: 12,
  timezone: 64,
  geofence: TEXT, // JSON

  // attendance
  punchType: 16,
  source: 32,
  notes: 512,
  reason: 512,
  comment: 512,
  lateReason: 256,
  ipAddress: 64,
  deviceId: 128,
  photoFileId: 64,
  checkInAt: 32,
  checkOutAt: 32,
  workDate: 10,
  requestedCheckInAt: 32,
  requestedCheckOutAt: 32,

  // leave
  leaveTypeName: 64,
  code: 32,
  color: 16,
  description: 512,
  year: 4,
  month: 7, // YYYY-MM
  startDate: 10,
  endDate: 10,
  halfDaySession: 16,

  // payroll
  currency: 8,
  components: TEXT, // JSON
  breakdown: TEXT, // JSON
  bankCsv: TEXT,
  periodStart: 10,
  periodEnd: 10,
  payslipNumber: 64,
  pdfFileId: 64,
  salaryStructureId: 64,
  payrollRunId: 64,

  // audit
  action: 64,
  entityType: 64,
  entityId: 64,
  actorUserId: 64,
  actorEmail: 254,
  metadata: TEXT, // JSON
  meta: TEXT, // JSON
  ip: 64,
  userAgent: 256,

  // attendance (actual keys in config)
  dateIso: 10,
  dayOfWeek: 16,
  clockInTime: 32,
  clockOutTime: 32,
  note: 512,
  locationName: 128,
  requestedClockIn: 32,
  requestedClockOut: 32,
  reviewNote: 512,
  region: 64,
  effectiveFrom: 10,
  totals: TEXT, // JSON

  // generic titles
  title: 128,
  label: 128,
  location: 128,
};

const path = join(__dirname, "appwrite.config.json");
const cfg = JSON.parse(readFileSync(path, "utf8"));

let applied = 0;
let unknown = [];

for (const col of cfg.collections || []) {
  for (const attr of col.attributes || []) {
    if (attr.type !== "string") continue;
    if (attr.format === "enum" || attr.format === "email") continue;

    if (SIZES[attr.key] != null) {
      if (attr.size !== SIZES[attr.key]) {
        attr.size = SIZES[attr.key];
        applied++;
      }
    } else {
      // Sensible fallback by name patterns
      let size = 128;
      if (/Id$/i.test(attr.key)) size = 64;
      else if (/At$/i.test(attr.key) || /Date$/i.test(attr.key)) size = 32;
      else if (/Json$/i.test(attr.key) || /Flags$/i.test(attr.key) || /Settings$/i.test(attr.key))
        size = TEXT;
      else if (/Email$/i.test(attr.key)) size = 254;
      else if (/Phone|Mobile/i.test(attr.key)) size = 20;
      else if (/Code$/i.test(attr.key)) size = 32;
      else unknown.push(`${col.$id}.${attr.key} (default ${size})`);
      if (attr.size !== size) {
        attr.size = size;
        applied++;
      }
    }
  }
}

const json = JSON.stringify(cfg, null, 4) + "\n";
writeFileSync(path, json);
writeFileSync(join(__dirname, "appwrite.json"), json);

console.log(`Applied logical sizes to ${applied} attributes`);
if (unknown.length) {
  console.log("Fallbacks used:");
  for (const u of unknown) console.log(`  - ${u}`);
}

// Rough MariaDB row budget for employees (utf8mb4 VARCHAR counts as size*4)
const emp = cfg.collections.find((c) => c.$id === "employees");
let budget = 0;
for (const a of emp.attributes) {
  if (a.type !== "string" || a.format === "enum") continue;
  if ((a.size || 0) > 16384) continue; // TEXT
  if (a.format === "email") budget += 254 * 4;
  else budget += (a.size || 0) * 4;
}
console.log(`employees estimated VARCHAR row bytes: ${budget} (limit ~8126)`);
