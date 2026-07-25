/**
 * Extends employees + adds employee_documents collection for profile/documents.
 * Run: node appwrite/patch-employee-profile-schema.mjs
 * Then: node appwrite/setup-schema.mjs && node appwrite/setup-storage.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, 'appwrite.config.json');
const cfg = JSON.parse(readFileSync(path, 'utf8'));

const str = (key, size = 128, required = false) => ({
  key,
  type: 'string',
  status: 'available',
  required,
  array: false,
  size,
  default: null,
});
const en = (key, elements, required = true) => ({
  key,
  type: 'string',
  status: 'available',
  required,
  array: false,
  elements,
  format: 'enum',
  default: null,
});
const num = (key, required = false, min = null, max = null) => ({
  key,
  type: 'integer',
  status: 'available',
  required,
  array: false,
  default: null,
  min,
  max,
});
const idx = (key, attrs, type = 'key') => ({
  key,
  type,
  status: 'available',
  attributes: attrs,
  orders: attrs.map(() => 'ASC'),
});

const employees = cfg.collections.find((c) => c.$id === 'employees');
if (!employees) throw new Error('employees collection missing');

const extraEmployeeAttrs = [
  str('currentAddressLine1', 256),
  str('currentAddressLine2', 256),
  str('currentPincode', 12),
  str('profilePictureFileId', 64),
];

for (const attr of extraEmployeeAttrs) {
  if (!employees.attributes.some((a) => a.key === attr.key)) {
    employees.attributes.push(attr);
  }
}

const employeeDocuments = {
  $id: 'employee_documents',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'employee_documents',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('employeeId', 64, true),
    str('userId', 64, true),
    en('category', ['profile_picture', 'identity', 'compliance', 'employment'], true),
    str('title', 256, true),
    str('fileId', 64, true),
    str('fileName', 256, true),
    str('mimeType', 128, true),
    num('fileSize', true, 1, 10485760),
    str('uploadedByUserId', 64, true),
    en('status', ['active', 'archived'], true),
  ],
  indexes: [
    idx('company_employee_idx', ['companyId', 'employeeId']),
    idx('employee_category_idx', ['employeeId', 'category']),
  ],
};

const byId = new Map(cfg.collections.map((c) => [c.$id, c]));
byId.set('employees', employees);
byId.set('employee_documents', employeeDocuments);
cfg.collections = [...byId.values()];

if (!cfg.buckets) cfg.buckets = [];
if (!cfg.buckets.some((b) => b.$id === 'employee_documents')) {
  cfg.buckets.push({
    $id: 'employee_documents',
    name: 'Employee documents',
    enabled: true,
    fileSecurity: true,
    maximumFileSize: 10485760,
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    compression: 'none',
    encryption: false,
    antivirus: false,
    $permissions: [],
  });
}

writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('Patched employees + employee_documents collection + employee_documents bucket');
