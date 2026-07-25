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
const idx = (key, attrs) => ({
  key,
  type: 'key',
  status: 'available',
  attributes: attrs,
  orders: attrs.map(() => 'ASC'),
});

const emp = cfg.collections.find((c) => c.$id === 'employees');
if (emp && !emp.attributes.some((a) => a.key === 'vendorId')) {
  const typeIdx = emp.attributes.findIndex((a) => a.key === 'employmentType');
  emp.attributes.splice(typeIdx + 1, 0, str('vendorId', 64));
}

let vendors = cfg.collections.find((c) => c.$id === 'three_pl_vendors');
if (!vendors) {
  vendors = {
    $id: 'three_pl_vendors',
    $permissions: [],
    databaseId: 'hr_portal',
    name: 'three_pl_vendors',
    enabled: true,
    documentSecurity: true,
    attributes: [
      str('companyId', 64, true),
      str('name', 128, true),
      str('contactName', 128),
      {
        key: 'contactEmail',
        type: 'string',
        status: 'available',
        required: false,
        array: false,
        format: 'email',
        default: null,
      },
      str('contactPhone', 32),
      en('status', ['active', 'inactive']),
    ],
    indexes: [idx('company_status_idx', ['companyId', 'status'])],
  };
  cfg.collections.push(vendors);
}

writeFileSync(path, `${JSON.stringify(cfg, null, 2)}\n`);
console.log('Patched org config schema: employees.vendorId + three_pl_vendors collection');
