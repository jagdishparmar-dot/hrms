# Appwrite schema (HR Portal)

Versioned source of truth: `appwrite.config.json`.

String sizes are logical (PAN 10, UAN 12, phone 20, IFSC 11, etc.). JSON/blob fields use size `16385` so Appwrite stores them as TEXT and MariaDB row-size limits are not hit. Re-apply with `node appwrite/apply-logical-sizes.mjs` if you edit attributes.

Collections: `companies`, `employees`, `audit_logs`, `sites`, `attendance_records`, `attendance_regularizations`, `leave_types`, `leave_balances`, `leave_requests`, `holidays`, `salary_structures`, `payroll_runs`, `payslips`.

## Prerequisites

- Self-hosted Appwrite **1.7.x** (this project: `1.7.4`)
- API key with databases (+ teams/users for app runtime) in `my-app/.env.local` as `APPWRITE_API_KEY`

## Preferred — Admin API from `appwrite.config.json`

CLI `push collections` on 1.7.4 often recreates string attrs (`encrypt false → undefined`) and can leave attributes stuck. Use these scripts instead (still driven by **`appwrite.config.json`**).

**Full recreate (OK when no data to keep):**

```bash
node appwrite/recreate-schema.mjs
```

**Idempotent apply / repair (keeps existing data):**

```bash
node appwrite/setup-schema.mjs
```

`recreate-schema` deletes `hr_portal` then recreates every collection/attribute/index from the config.

## Demo seed data

```bash
node appwrite/seed-demo.mjs --reset
# optional volume knobs:
node appwrite/seed-demo.mjs --reset --employees=50 --days=45
```

Creates two tenants (`acme-demo`, `beta-demo`) with sites, employees, attendance history, leave, salary structures, and a payroll run. Credentials are printed at the end.

## Optional — Appwrite CLI (same config, different filename)

If you use CLI **8.2.x** (matches server 1.7.x), copy config first:

```bash
cd appwrite
npm i -g appwrite-cli@8.2.2
copy appwrite.config.json appwrite.json   # CLI 8 reads appwrite.json
appwrite client --endpoint https://appwrite.intoship.cloud/v1 --project-id 6a620077001e71c1acde --key "%APPWRITE_API_KEY%"
appwrite push collections --all --force
```

Do **not** use CLI 23.x against Appwrite 1.7.4.

## Env sync (`my-app/.env.local`)

```env
NEXT_PUBLIC_APPWRITE_DATABASE_ID=hr_portal
NEXT_PUBLIC_APPWRITE_COMPANIES_COLLECTION_ID=companies
NEXT_PUBLIC_APPWRITE_EMPLOYEES_COLLECTION_ID=employees
NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs
NEXT_PUBLIC_APPWRITE_SITES_COLLECTION_ID=sites
NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID=attendance_records
NEXT_PUBLIC_APPWRITE_REGULARIZATIONS_COLLECTION_ID=attendance_regularizations
NEXT_PUBLIC_APPWRITE_LEAVE_TYPES_COLLECTION_ID=leave_types
NEXT_PUBLIC_APPWRITE_LEAVE_BALANCES_COLLECTION_ID=leave_balances
NEXT_PUBLIC_APPWRITE_LEAVE_REQUESTS_COLLECTION_ID=leave_requests
NEXT_PUBLIC_APPWRITE_HOLIDAYS_COLLECTION_ID=holidays
NEXT_PUBLIC_APPWRITE_SALARY_STRUCTURES_COLLECTION_ID=salary_structures
NEXT_PUBLIC_APPWRITE_PAYROLL_RUNS_COLLECTION_ID=payroll_runs
NEXT_PUBLIC_APPWRITE_PAYSLIPS_COLLECTION_ID=payslips
PLATFORM_ADMIN_EMAILS=you@example.com
```

## Teams (runtime, not schema)

One Appwrite Team is created **per company** at provision time. Roles: `company_admin`, `employee`. Document permissions use `team:{teamId}` / `team:{teamId}/{role}`.
