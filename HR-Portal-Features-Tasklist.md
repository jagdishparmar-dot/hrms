# HR Management Portal — Features Task List

**Source:** [HR-Portal-Feature-Draft.md](./HR-Portal-Feature-Draft.md)  
**Purpose:** Phase-wise tracking of what to build. Statuses reflect current codebase (web `my-app` + mobile `checkin-mobile`) as of draft creation.  
**Status legend**

| Status | Meaning |
|---|---|
| `Done` | Working end-to-end for the scoped MVP of that item |
| `Partial` | Started / stubbed / fields only — needs completion |
| `Not started` | Not in codebase yet |
| `Deferred` | Intentionally out of current phase (see Phase 2/3) |
| `Blocked` | Waiting on open question / dependency |

Update status as features land. Do not treat this as a build order within a phase unless marked **Priority**.

---

## Snapshot

| Phase | Focus | Done | Partial | Not started | Deferred |
|---|---|---|---|---|---|
| **0 — Foundation** | Multi-tenant, RBAC, platform admin | 7 | 3 | 0 | — |
| **1 — MVP** | Auth, employees, attendance, leave, simple payroll | ~22 | ~8 | ~6 | — |
| **2 — Differentiator** | 3PL payroll, statutory, mobile polish, notifications, reports | 0 | 2 | 22 | — |
| **3 — Scale** | SSO, custom reports, vendor invoicing, multi-country, optional HR modules | 0 | 0 | 10 | — |

*Phase 1 counts reset: prior single-tenant implementations were wiped with Appwrite schema erase; rebuild on Phase 0 tenancy.*

*Counts are approximate checklist items — use sections below as source of truth.*

---

## Phase 0 — Foundation (prerequisite for multi-tenant SaaS)

> Draft §§2–3, 16–17. Schema + web foundation landed 2026-07-23. See `appwrite/` + `my-app` routes `/signup`, `/platform`, `/settings`.

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F0-01 | `companies` tenant model + `companyId` on all collections | P0 | Done | `hr_portal`: companies, employees, audit_logs; employees carry companyId |
| F0-02 | Appwrite Teams + document permissions per tenant | P0 | Done | One Team per company; team + company_admin doc perms at provision |
| F0-03 | Tenant provisioning (self-serve signup + admin-provisioned) | P0 | Done | `/signup` + `/platform` provision form |
| F0-04 | Subdomain routing (`company.yourapp.com` → `companyId`) | P1 | Partial | Middleware sets `x-company-slug`; `{slug}.localhost` + `hr_company_id` cookie fallback |
| F0-05 | Per-tenant branding (logo, color, email sender, payslip letterhead) | P2 | Partial | logo/color/sender on settings; payslip letterhead deferred to payroll |
| F0-06 | Plan limits + feature flags per tenant | P1 | Done | plan, maxEmployees, featureFlags editable in `/platform` |
| F0-07 | Tenant settings shell (work week, timezone, currency, jurisdiction) | P0 | Done | `/settings` for company_admin |
| F0-08 | Platform Super Admin console (tenants, billing, flags, impersonation) | P1 | Partial | `/platform` list/create/plan/flags/suspend; billing + impersonation later |
| F0-09 | Granular RBAC (module × action) + baseline roles | P0 | Partial | company_admin vs employee enforced; role enum ready; module×action matrix later |
| F0-10 | Audit log collection for admin/config + sensitive actions | P1 | Done | Written on provision + settings/plan updates |

**Exit criteria:** New company can be provisioned; all employee/attendance data scoped by `companyId`; HR Admin vs Employee roles enforceable. — *Met for company/employee foundation; attendance returns in Phase 1.*

---

## Phase 1 — MVP

> Draft §18 Phase 1: multi-tenant setup, auth, onboarding + profile, geofenced attendance + web dashboard, leave, permanent payroll (simple).

### 1A — Authentication & login (§4)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-A01 | Email/password auth (web + mobile) | P0 | Done | Web + mobile against `hr_portal` / employees |
| F1-A02 | Session management (web cookie vs mobile session) | P0 | Partial | Web session + company cookie; mobile session; no device list |
| F1-A03 | First-login forced password reset + profile completion | P0 | Done | `mustChangePassword` + `/change-password` gate |
| F1-A04 | Password policy (tenant-enforceable) | P1 | Partial | Min 8 chars only |
| F1-A05 | Optional 2FA (per tenant) | P2 | Deferred | Phase 2 |
| F1-A06 | Magic link / OTP (phone) login | P2 | Deferred | Phase 2 |
| F1-A07 | Device-bound login for attendance app (1–2 devices) | P1 | Not started | Buddy-punch control |
| F1-A08 | SSO (Google / Microsoft) | — | Deferred | Phase 3 |

### 1B — Employee onboarding (§5)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-B01 | Admin create employee (user + profile) | P0 | Done | `/employees` create → Appwrite user + team + employee doc |
| F1-B02 | Employment type tagging (Permanent / 3PL / Intern / Consultant) | P0 | Done | Enum on employees + forms |
| F1-B03 | Employee list + search + detail/edit | P0 | Done | `/employees`, `/employees/[id]` |
| F1-B04 | Pre-boarding: offer letter, acceptance, document checklist | P1 | Not started | — |
| F1-B05 | Configurable onboarding workflow / checklist builder | P2 | Not started | — |
| F1-B06 | Self-onboarding portal (candidate fills before Day 1) | P1 | Deferred | Self-register disabled; HR provisions |
| F1-B07 | Document vault + expiry reminders | P1 | Not started | — |
| F1-B08 | Bulk CSV/Excel import | P1 | Not started | — |
| F1-B09 | BGV status tracking | P2 | Deferred | Phase 2+ |
| F1-B10 | Offboarding workflow + F&F trigger | P1 | Partial | Status inactive possible via edit; no F&F |

### 1C — Employee profile & ESS (§6)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-C01 | Personal / contact / emergency / family fields | P0 | Done | Personal/contact/emergency on web edit |
| F1-C02 | Employment details (dept, designation, manager, location, cost center) | P0 | Done | Fields + site/shift assignment |
| F1-C03 | Bank + statutory fields (PAN, Aadhaar masked, UAN, ESIC) | P0 | Done | Logical sizes; masked display in forms |
| F1-C04 | Mobile ESS profile view/edit | P0 | Partial | Profile screen; full edit still web-first |
| F1-C05 | Payslip / Form 16 download | P1 | Partial | Web payslip print view; Form 16 later |
| F1-C06 | Leave balance + attendance history in ESS | P0 | Partial | Web leave balances; mobile attendance history |
| F1-C07 | Asset assignment record | P2 | Deferred | Phase 2+ |
| F1-C08 | Helpdesk / tickets | — | Deferred | Phase 2 optional |

### 1D — Attendance & geofencing (§7, §15)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-D01 | Mobile punch in/out to Appwrite | P0 | Done | Via `/api/v1/attendance/punch` + JWT |
| F1-D02 | Geofence validation at punch | P0 | Done | Server-side site radius check |
| F1-D03 | Site/geofence master (`sites` collection) + assign employees | P0 | Done | `/sites` + primary/alternate on employee |
| F1-D04 | Store punch lat/long + accuracy + geofence status | P0 | Done | punchIn/Out lat/long/accuracy fields |
| F1-D05 | Web attendance dashboard (filters, daily/monthly) | P0 | Done | `/attendance` month/status/user filters |
| F1-D06 | Late / half-day / absent rules from shift times | P0 | Partial | LATE vs PRESENT via shift + grace; half-day/absent later |
| F1-D07 | Regularization request → manager approve | P0 | Done | Mobile submit API + web approve |
| F1-D08 | Shift templates + roster (basic) | P1 | Partial | Shift start/end on employee |
| F1-D09 | Overtime / grace / auto-absent config | P1 | Partial | Grace via env `ATTENDANCE_LATE_GRACE_MINUTES` |
| F1-D10 | Attendance-to-payroll feed (payable days) | P0 | Done | Payroll run uses present/late + leave days |
| F1-D11 | Offline punch queue | — | Deferred | Phase 2 |
| F1-D12 | Mock-location detection / selfie punch | — | Deferred | Phase 2 |
| F1-D13 | Team heatmap / exceptions report | P2 | Not started | Table only |

### 1E — Leave & holidays (§11)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-E01 | Leave types + accrual rules per tenant | P0 | Partial | Types + opening balances; no auto-accrual engine |
| F1-E02 | Leave apply + approval chain + balances | P0 | Done | `/leave` apply + admin review |
| F1-E03 | Company / regional holiday calendar | P0 | Done | Holidays CRUD on `/leave` |
| F1-E04 | Leave ↔ attendance ↔ payroll reflection | P0 | Partial | Approved leave days feed payroll |
| F1-E05 | Carry-forward / encashment rules | P1 | Not started | — |

### 1F — Payroll — permanent, simple (§8)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-F01 | Salary structure builder (CTC components) | P0 | Done | Per-employee structure on employee detail |
| F1-F02 | Salary templates by grade/dept | P1 | Not started | — |
| F1-F03 | Monthly payroll run (attendance → net) | P0 | Done | `/payroll` finalize run |
| F1-F04 | Payslip PDF generate + download/email | P0 | Partial | Printable payslip page (browser PDF); Storage PDF later |
| F1-F05 | Bonus / incentive / arrears | P2 | Deferred | Phase 2 |
| F1-F06 | Full & final settlement | P1 | Not started | — |
| F1-F07 | Loan/advance + EMI | P2 | Deferred | Phase 2 |
| F1-F08 | Bank transfer file export | P1 | Done | Generic bank CSV export |
| F1-F09 | Multi-currency | — | Deferred | Phase 3 |

### 1G — Company settings (MVP slice) (§12)

| ID | Feature | Priority | Status | Notes / current state |
|---|---|---|---|---|
| F1-G01 | Org structure: departments, designations, locations | P0 | Partial | Free text on employee; no masters |
| F1-G02 | Geofence site management UI | P0 | Done | `/sites` |
| F1-G03 | Leave policy + pay cycle date config | P0 | Partial | Types/holidays; pay cycle still simple month |
| F1-G04 | Role/permission customization UI | P1 | Not started | Depends on F0-09 |
| F1-G05 | Notification preference toggles | — | Deferred | Phase 2 |

### Phase 1 exit criteria

- [x] Tenant-isolated company with HR Admin + Employee roles  
- [x] Hire → profile → geofenced punch → attendance visible on web  
- [x] Leave apply/approve with balances  
- [x] One permanent payroll run producing downloadable payslips (print-to-PDF)  
- [x] Sites configurable (not hardcoded radius/coords only)

---

## Phase 2 — Differentiator

> Draft §18 Phase 2: 3PL payroll, statutory engine, mobile polish, notifications, reports.

### 2A — 3PL / vendor payroll (§9)

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F2-A01 | Vendor/agency master under tenant | P0 | Not started | — |
| F2-A02 | Dual-rate model (billing vs pay) + margin (internal) | P0 | Not started | — |
| F2-A03 | Separate 3PL payroll cycle (daily/hourly/piece-rate) | P0 | Not started | — |
| F2-A04 | Contract start/end + renewal alerts + auto-deactivate | P0 | Not started | — |
| F2-A05 | 3PL onboarding fields (vendor, rates, contract IDs) | P0 | Not started | Extends F1-B02 |
| F2-A06 | Compliance ownership flag (agency vs principal) | P1 | Not started | — |
| F2-A07 | Vendor Admin role — segregated visibility | P0 | Blocked | Open Q2 — Phase 1 vs 2 for vendor login |
| F2-A08 | Vendor invoicing / billing statement vs attendance | — | Deferred | Phase 3 |

### 2B — Statutory compliance — India-first (§10)

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F2-B01 | Rules engine / config tables (not hardcoded rates) | P0 | Not started | — |
| F2-B02 | PF (EPF/EPS) calc + ECR file | P0 | Not started | UAN field exists only |
| F2-B03 | ESI eligibility + contribution + return | P0 | Not started | ESI number field only |
| F2-B04 | Professional Tax — state slabs | P0 | Blocked | Open Q1 — pilot states |
| F2-B05 | LWF where applicable | P1 | Blocked | Open Q1 |
| F2-B06 | TDS + Form 24Q + Form 16 | P0 | Not started | Tax regime ESS screen needed |
| F2-B07 | Minimum wage checks (state/skill) | P1 | Not started | Especially 3PL |
| F2-B08 | Gratuity & Bonus Act calcs | P1 | Not started | — |
| F2-B09 | Statutory registers (wage register) | P1 | Not started | — |
| F2-B10 | Multi-state rules by employee work location | P0 | Not started | — |

### 2C — Mobile polish (§7, §15)

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F2-C01 | Offline punch queue + sync + large-gap review flag | P0 | Not started | — |
| F2-C02 | Mock-location / spoof detection | P0 | Not started | — |
| F2-C03 | Optional selfie / liveness with punch | P1 | Blocked | Open Q3 — hard req vs add-on |
| F2-C04 | Device binding enforcement | P0 | Not started | Extends F1-A07 |
| F2-C05 | Leave apply + payslip view on mobile | P0 | Not started | Depends on Phase 1 leave/payroll |
| F2-C06 | In-app notification center | P0 | Not started | — |

### 2D — Notifications (§13)

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F2-D01 | Email notifications (onboarding, leave, payslip, expiry) | P0 | Not started | — |
| F2-D02 | Push notifications (mobile) | P0 | Not started | Profile toggles are UI stubs |
| F2-D03 | SMS / WhatsApp (optional) | P2 | Not started | — |
| F2-D04 | Per-tenant notification templates | P1 | Not started | — |

### 2E — Reports & analytics (§14)

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F2-E01 | Headcount / attrition / permanent vs 3PL mix | P0 | Partial | Dashboard headcount + present only |
| F2-E02 | Attendance exception reports | P0 | Not started | — |
| F2-E03 | Payroll cost + salary register | P0 | Not started | — |
| F2-E04 | PF/ESI/PT/TDS statutory report downloads | P0 | Not started | — |
| F2-E05 | 3PL vendor-wise cost & headcount | P1 | Not started | — |
| F2-E06 | Scheduled export Excel/PDF | P1 | Not started | — |
| F2-E07 | Custom report builder | — | Deferred | Phase 3 |

### Phase 2 exit criteria

- [ ] 3PL workers run on separate/dual-rate payroll with vendor segregation  
- [ ] PF/ESI/PT/TDS for pilot jurisdiction(s) generating files  
- [ ] Offline-safe punches + anti-spoof basics  
- [ ] Ops can email/push key HR events  
- [ ] Statutory + attendance exception reports downloadable  

---

## Phase 3 — Scale & expand

> Draft §18 Phase 3.

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F3-01 | SSO (Google Workspace / Microsoft 365) per tenant | P0 | Not started | — |
| F3-02 | Custom report builder | P0 | Not started | — |
| F3-03 | Vendor invoicing output reconciled to attendance | P0 | Not started | From §9 |
| F3-04 | Multi-country / multi-currency payroll | P1 | Not started | — |
| F3-05 | Performance management module | P2 | Not started | Scope expansion |
| F3-06 | Recruitment / ATS module | P2 | Not started | Scope expansion |
| F3-07 | Biometric hardware / attendance add-on | P2 | Not started | Plan feature flag |
| F3-08 | Custom domain (beyond subdomain) | P2 | Not started | — |
| F3-09 | Helpdesk / HR tickets (ESS) | P2 | Not started | From §6 |
| F3-10 | Asset management | P2 | Not started | From §6 |

---

## Cross-cutting / NFR checklist (§16–17)

Track alongside phases; not optional for production.

| ID | Item | Target phase | Status | Notes |
|---|---|---|---|---|
| NFR-01 | Appwrite collections per draft data model | 0–1 | Partial | Only `profiles` + `attendance_records` today |
| NFR-02 | Appwrite Functions for payroll, PDF, geofence, reminders | 1–2 | Not started | Logic mostly in Next/mobile clients |
| NFR-03 | Strict tenant isolation on every query | 0 | Not started | — |
| NFR-04 | Field-level masking (bank/PII by role) | 1 | Not started | — |
| NFR-05 | Encrypt sensitive PII at rest (beyond Appwrite defaults) | 1–2 | Not started | Validate Appwrite + app strategy |
| NFR-06 | Punch never silently dropped (queue/retry) | 1–2 | Partial | Online path works; no offline queue |
| NFR-07 | Immutable finalized payroll + versioned corrections | 1–2 | Not started | — |
| NFR-08 | DPDP Act alignment (consent, retention, export) | 2 | Not started | Tenant data retention settings in §12 |
| NFR-09 | Privacy policy: location only at punch (not continuous) | 1 | Partial | Mobile already punch-time only; document formally |

---

## Open questions (blockers)

From draft §19 — resolve before locking Phase 1/2 scope.

| # | Question | Affects | Decision | Status |
|---|---|---|---|---|
| Q1 | Pilot states/countries (PT/LWF first)? | F2-B04, F2-B05, F0-07 | _TBD_ | Open |
| Q2 | 3PL vendor portal login in Phase 1 or 2? | F2-A07 | _TBD_ — draft suggests Phase 2 | Open |
| Q3 | Selfie/biometric punch hard requirement? | F2-C03 | _TBD_ | Open |
| Q4 | Bank file: specific Indian banks vs generic export? | F1-F08 | _TBD_ | Open |
| Q5 | Build compliance in-house vs integrate vendor? | F2-B* | _TBD_ | Open |

---

## Suggested build sequence (when you start)

Within Phase 1, a practical order that matches dependencies:

1. **Phase 0** — `companyId` + Teams + baseline roles (unblocks everything)  
2. **Sites + geofence config** — finish attendance correctness  
3. **Onboarding polish** — employment type enum, deactivate/offboard  
4. **Leave module** — types, apply, approve, holidays  
5. **Regularization + late/absent rules** — clean attendance feed  
6. **Simple permanent payroll + payslips** — MVP closed loop  
7. Then Phase 2 differentiators (3PL + statutory)

---

## How to update this file

- Flip `Status` only; keep IDs stable (`F1-D07`, etc.) so chats/PRs can reference them.  
- When shipping a feature, add a one-line note under **Notes** (PR / date optional).  
- Recalculate the Snapshot table occasionally after a milestone.  
- Feature draft remains the product “why”; this file is the delivery “what/when/status.”

---

*Task list draft v0.1 — aligned to Feature Draft v0.1. Ready for review before build.*
