# HR Management Portal — Feature Draft
**Multi-tenant SaaS | Web (Next.js) + Mobile Attendance App | Backend: Appwrite**

*Draft v0.1 — prepared for internal review*

---

## 1. Product Overview

A multi-tenant HR platform where each subscribing company ("tenant") gets an isolated workspace to manage:
- Employee onboarding and lifecycle
- Employee self-service profiles
- Login / authentication
- Attendance via mobile app with geofenced punch-in/punch-out
- Payroll for two workforce categories: **Permanent employees** and **3PL / third-party / contract-staffing employees**

Reference points used for this draft: modern HR SaaS suites (BambooHR, Paycom, Paycor, Keka, greytHR, Zoho People, Darwinbox) and India-specific payroll/compliance platforms, since 3PL payroll and geofenced attendance are especially common patterns in the Indian HRMS market. Sections below flag India-specific statutory items separately so the document stays usable even if you expand to other geographies later.

---

## 2. Multi-Tenancy Model

| Aspect | Approach |
|---|---|
| Tenant isolation | One "Company" (tenant) document per organization; every collection (employees, attendance, payroll, etc.) carries a `companyId` and Appwrite **Teams + Permissions** scoped per document/collection so tenant data never crosses over |
| Tenant provisioning | Self-serve signup (company admin registers) or admin-provisioned (you onboard the company manually) |
| Custom domain / subdomain | `companyname.yourapp.com` routing in Next.js middleware, resolved to `companyId` at request time |
| Branding | Per-tenant logo, primary color, email/SMS sender name, payslip letterhead |
| Plan/limits | Employee count caps, feature flags per plan (e.g., 3PL payroll module, geofencing, biometric add-on) enabled per tenant |
| Tenant-level settings | Work week, holiday calendar, leave policy, pay cycle date, currency, timezone, statutory jurisdiction(s) |
| Super-admin console | Anthropic-style "platform admin" role outside any tenant — manages tenant onboarding, billing, feature flags, impersonation for support |

---

## 3. Roles & Permissions (RBAC)

Suggested baseline roles, each further scoped by `companyId`:

- **Platform Super Admin** — cross-tenant, manages the SaaS itself
- **Company Admin / HR Admin** — full control within their tenant
- **HR Manager** — onboarding, profile, attendance, leave approvals (no payroll access, or view-only)
- **Payroll Admin / Finance** — payroll processing, salary structures, statutory filings
- **Reporting Manager** — approves attendance/leave for direct reports, views team data only
- **Employee (Permanent)** — self-service only
- **Employee (3PL/Contract)** — self-service, scoped to their agency/vendor if applicable
- **3PL Vendor Admin (optional)** — a contact person at the staffing agency who can view/manage their deployed workforce's attendance and payroll inputs, without seeing permanent-employee data

Permissions should be granular (module × action: view/create/edit/approve/export) rather than role-hardcoded, so each company can customize.

---

## 4. Authentication & Login

- Appwrite Auth: email/password, magic link, and OTP (phone) login
- Optional SSO (Google Workspace / Microsoft 365) per tenant — common ask from mid-size companies
- Mandatory password policy + optional 2FA, enforceable per tenant
- Device-bound login for the attendance mobile app (bind employee to 1–2 registered devices to curb buddy-punching)
- Session management: web sessions separate from mobile sessions; admin can force-logout a device
- First-login flow forces password reset + profile completion for new hires

---

## 5. Employee Onboarding

- **Pre-boarding**: offer letter upload, digital acceptance, document checklist (ID proof, address proof, education certificates, PF/UAN number if applicable, bank details)
- **Configurable onboarding workflow builder**: each company defines its own task checklist and approval chain (IT asset issuance, HR induction, manager welcome, policy acknowledgment)
- **Self-onboarding portal**: candidate fills personal details, uploads documents, e-signs policies *before* Day 1 — data flows straight into the employee record (no re-keying), mirroring what leading platforms now do
- **Employment type tagging at onboarding**: Permanent / 3PL-Contract / Intern / Consultant — this tag drives which payroll engine and compliance rules apply downstream
- **3PL-specific onboarding fields**: vendor/agency name, vendor contract ID, billing rate to client vs. pay rate to employee, contract start/end date, auto-alerts before contract expiry
- Bulk onboarding via CSV/Excel import for batches (useful for 3PL agencies onboarding many workers at once)
- Background verification status tracking (manual or integrated with a BGV vendor later)
- Offboarding workflow mirrored: clearance checklist, asset return, full & final settlement trigger

---

## 6. Employee Profile & Self-Service (ESS)

- Personal info, contact, emergency contact, family details
- Employment details: designation, department, reporting manager, location, employment type, cost center
- Document vault (ID proofs, certificates, contracts) with expiry reminders
- Bank & statutory details (bank account, PAN, Aadhaar last-4 masked, UAN, ESIC number — India context)
- Tax declaration / investment declaration screen (India: old vs. new tax regime selection)
- Payslip and Form 16 download
- Leave balance, attendance history, regularization requests
- Asset assignment record (laptop, ID card, etc.)
- Helpdesk/ticket raise (HR query, IT query) — optional Phase 2

---

## 7. Attendance Module (Mobile App + Geofencing)

- **Punch in/out** from the mobile app only within a geofence radius configured per employee's assigned office/site
- **Geofence configuration**: company defines one or more site locations (lat/long + radius in meters); an employee can be assigned to a primary site and optional alternate sites (for 3PL staff deployed at client locations)
- **Location capture** stored with each punch (lat/long, accuracy, address reverse-geocoded) for audit
- **Anti-spoofing controls**: mock-location detection, device binding, optional selfie-with-punch or liveness check (common add-on in field/security-workforce HR tools)
- **Offline punch queueing**: app caches punch locally if network is unavailable and syncs when back online, flagged for review if the timestamp gap is large
- **Regularization workflow**: employee requests correction for missed/failed punch → manager approves
- **Shift management**: multiple shift templates, roster assignment, night-shift handling
- **Overtime & late-mark rules** configurable per company (grace period, half-day threshold, auto-absent marking)
- **Attendance-to-payroll feed**: attendance data becomes the direct input for payable days/overtime in the payroll run
- **Web dashboard views**: daily/monthly attendance sheet, team attendance heatmap, exceptions report (missed punches, geofence violations)

---

## 8. Payroll — Permanent Employees

- Configurable salary structure builder: CTC breakup (Basic, HRA, Special Allowance, other components), earnings, deductions, reimbursements
- Multiple salary templates assignable by grade/department
- Monthly payroll run: attendance/leave data → payable days → gross → deductions → net pay
- Payslip generation (PDF, downloadable + emailed)
- Bonus, incentive, and arrears processing
- Full & final settlement on exit (gratuity, leave encashment, notice pay recovery)
- Loan/advance management with EMI deduction schedules
- Bank transfer file generation (per-bank format) for salary disbursement
- Multi-currency support if a tenant has employees in different countries (Phase 2)

---

## 9. Payroll — 3PL / Contract / Vendor-Sourced Employees

This is the differentiator vs. a generic HRMS, so worth its own explicit design:

- **Vendor/agency master**: each 3PL agency is a sub-entity under the company tenant, with its own commercial terms
- **Dual-rate model**: billing rate (what the client company pays the agency) vs. pay rate (what the worker actually receives) — margin tracked internally, not shown to the worker
- **Separate payroll run/cycle option**: 3PL payroll can run on a different cycle or basis (daily-wage, hourly, piece-rate) than permanent payroll
- **Contract lifecycle tracking**: start/end dates, renewal alerts, auto-deactivation of access on contract end
- **Vendor invoicing output**: generate the invoice/billing statement the client owes each agency, reconciled against attendance
- **Compliance ownership flag**: mark whether PF/ESI for that worker is managed by the agency or by the principal employer (common real-world distinction) — this changes which statutory reports the platform needs to generate
- **Segregated visibility**: 3PL vendor admins see only their deployed workforce; permanent-employee salary data stays invisible to them

---

## 10. Statutory Compliance (India-first, configurable for other geographies)

Since 3PL payroll and geofenced attendance are especially common in the Indian market, the payroll engine should be built compliance-first for India, with room to add other countries later:

- **PF (EPF/EPS)**: employer/employee contribution calc, UAN capture, ECR file generation
- **ESI**: eligibility threshold check, contribution calc, ESI return generation
- **Professional Tax (PT)**: state-wise slab configuration (PT rules vary by state — e.g., different for Gujarat, Maharashtra, Karnataka, etc.)
- **LWF (Labour Welfare Fund)**: state-wise, where applicable
- **TDS**: monthly computation per chosen tax regime, quarterly Form 24Q support, annual Form 16 generation
- **Minimum wage compliance checks** by state/skill category — relevant for daily-wage/3PL workers
- **Gratuity & Bonus Act** calculations for eligible employees
- **Statutory registers**: digital, audit/inspection-ready wage registers
- **Multi-state support**: a company with offices across states needs PT/LWF rules applied per employee's work location, not just company HQ
- Compliance rules should live in a rules-engine/config table (not hardcoded), since rates and slabs change and need updates without a code deploy

---

## 11. Leave & Holiday Management

- Configurable leave types (casual, sick, earned/privilege, maternity/paternity, comp-off, unpaid) per tenant, with accrual rules
- Company holiday calendar, regional holiday calendar (per work location)
- Leave application, approval chain, balance tracking, carry-forward/encashment rules
- Integration with attendance: leave days auto-reflect as present/paid in payroll

---

## 12. Company (Tenant) Settings

- Organization structure: departments, designations, locations/sites, cost centers
- Geofence site management (add/edit office & client-site geofences)
- Shift & roster templates
- Leave policy configuration
- Payroll cycle date, salary component templates, statutory jurisdiction(s)
- Branding (logo, colors, payslip template, email templates)
- Role & permission customization
- Notification preferences (email/SMS/push toggles per event)
- Audit log of all admin-level configuration changes
- Data retention & export settings (for compliance/offboarding of the tenant itself)

---

## 13. Notifications & Communication

- Push (mobile), email, and optional SMS/WhatsApp for: onboarding tasks, punch reminders, missed-punch alerts, leave approvals, payslip released, contract expiry (3PL), document expiry, birthday/anniversary
- In-app notification center with read/unread state
- Configurable per-tenant notification templates

---

## 14. Reports & Analytics

- Headcount, attrition, and workforce-mix (permanent vs. 3PL) dashboards
- Attendance exception reports (late, absent, geofence violations)
- Payroll cost reports, salary register, PF/ESI/PT/TDS statutory reports
- 3PL vendor-wise cost and headcount report
- Custom report builder (Phase 2) with scheduled export (Excel/PDF) to admins

---

## 15. Mobile App (Attendance-Focused)

- React Native or Flutter (decouple from the Next.js web app; connects to the same Appwrite backend via SDK/REST)
- Core screens: Punch in/out (map + geofence indicator), attendance history, leave apply, payslip view, profile, notifications
- Background location check only at punch action (not continuous tracking) to respect battery and privacy — worth stating explicitly in your privacy policy
- Biometric/selfie-with-punch as an optional per-tenant add-on

---

## 16. Suggested Appwrite Data Model (high level)

| Collection | Key fields |
|---|---|
| `companies` | name, subdomain, branding, plan, feature flags, statutory jurisdictions |
| `sites` | companyId, name, lat, long, radius |
| `users` (Appwrite Auth) | linked to `employees` via `userId` |
| `employees` | companyId, employmentType (Permanent/3PL/Intern), vendorId (nullable), siteId, department, designation, status |
| `vendors` (3PL agencies) | companyId, name, contract terms, billing rate rules |
| `documents` | employeeId, type, fileId (Appwrite Storage), expiryDate |
| `attendance` | employeeId, punchType, timestamp, lat/long, siteId, geofenceStatus, deviceId |
| `leaves` | employeeId, type, dates, status, approverId |
| `salaryStructures` | companyId/employeeId, components, effectiveDate |
| `payrollRuns` | companyId, month, status, totals |
| `payslips` | employeeId, payrollRunId, fileId |
| `statutoryReports` | companyId, month, type (PF/ESI/PT/TDS), fileId |
| `auditLogs` | companyId, actorId, action, entity, timestamp |

Use Appwrite **Functions** for: payroll calculation runs, geofence validation, statutory report generation, scheduled reminders (contract/document expiry), and PDF generation (payslips) — keeping heavy compute off the Next.js edge/serverless functions where it makes sense.

---

## 17. Non-Functional Requirements

- **Data isolation**: strict tenant scoping on every query; no cross-tenant leakage even via shared collections
- **Security**: encryption at rest for PII/bank details, role-based field-level masking (e.g., full bank account visible only to Payroll Admin), audit trail on sensitive actions
- **Compliance**: India's DPDP Act 2023 data-protection alignment if operating in India; standard practices (encrypted storage, RBAC, consent capture) apply regardless of geography
- **Scalability**: designed to support growth from a handful of pilot tenants to hundreds, each with independent employee counts
- **Availability**: attendance punches are latency-sensitive and must queue/retry on failure — never silently drop a punch
- **Auditability**: every payroll run and statutory report should be immutable once finalized, with versioned corrections rather than silent edits

---

## 18. Suggested Phased Roadmap

**Phase 1 — MVP**
Multi-tenant setup, auth/login, employee onboarding + profile, basic attendance (geofenced punch in/out, web dashboard), leave management, permanent-employee payroll (manual/simple).

**Phase 2**
3PL/vendor payroll module, statutory compliance engine (PF/ESI/PT/TDS/LWF), mobile app polish (offline queue, selfie punch), notifications, reports.

**Phase 3**
SSO, custom report builder, vendor invoicing, multi-country support, performance management / recruitment modules if scope expands beyond core HR-attendance-payroll.

---

## 19. Open Questions / Assumptions to Validate

1. Which states/countries will the pilot tenants operate in (drives which PT/LWF rules to build first)?
2. Will 3PL agencies get their own login (vendor portal) in Phase 1, or is that Phase 2?
3. Is biometric/selfie punch a hard requirement or a nice-to-have per tenant?
4. Do you need bank-file generation for specific Indian banks at launch, or a generic export format first?
5. Any existing payroll/compliance vendor you want to integrate with (or fully build in-house)?

---

*This is a first-pass draft to align scope before wireframing/DB schema finalization — happy to turn any section into detailed user stories, a DB schema, or Appwrite collection definitions next.*
