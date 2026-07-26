import type { HelpModule } from "@/lib/help/types";

export const TENANT_HELP_MODULES: HelpModule[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary:
      "Recommended setup order and first-week checklist for a new tenant admin.",
    keywords: [
      "onboarding",
      "setup",
      "checklist",
      "first week",
      "configure",
      "order",
    ],
    relatedSlugs: ["settings", "employees", "shifts"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "CheckIn HR is a multi-tenant portal for workforce management: employees, geofenced attendance, shifts, leave, and payroll. As a company admin, you configure the foundation first, then onboard people, then run daily operations.",
        ],
      },
      {
        id: "setup-order",
        title: "Recommended setup order",
        steps: [
          "Settings — set timezone, currency, work week, departments, and designations.",
          "Sites — create geofenced work locations with lat/long and radius.",
          "Shifts — define day, evening, and night shifts in the shift catalog.",
          "Employees — onboard staff with employment type, primary site, and login access.",
          "Roster — assign shifts to employees by date (daily or monthly view).",
          "Leave — configure leave types, holidays, and annual balance assignments.",
          "Attendance & Payroll — monitor daily punches and run monthly payroll when ready.",
        ],
      },
      {
        id: "first-week",
        title: "First-week checklist",
        bullets: [
          "Confirm timezone and currency in Settings match your operations.",
          "Add at least one active site before enabling geofenced punch-in.",
          "Create a General Day (09:00–18:00) and any night/cross-midnight shifts you need.",
          "Set up departments and designations before adding employees.",
          "Assign shifts on the roster for the current week.",
          "Configure leave types and assign opening balances for the year.",
          "Ask a test employee to punch in/out via the mobile app at an assigned site.",
        ],
      },
      {
        id: "roles",
        title: "Who does what",
        paragraphs: [
          "Company admins see the full sidebar: Employees, Sites, Shifts, Attendance, Payroll, Settings, and Help. Other tenant members (employees, managers) only see Dashboard and Leave — they punch in via mobile and apply for leave on the portal.",
        ],
      },
    ],
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    summary: "Workforce snapshot, KPI cards, and quick links to areas needing attention.",
    appRoute: "/dashboard",
    keywords: [
      "overview",
      "stats",
      "headcount",
      "present",
      "absent",
      "alerts",
      "KPI",
    ],
    relatedSlugs: ["attendance", "leave", "employees"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "The dashboard gives a read-only snapshot of today's workforce: headcount, attendance mix, open shifts, pending leave and regularizations, on-duty employees, and recent punches.",
        ],
      },
      {
        id: "kpis",
        title: "Key metrics",
        bullets: [
          "Headcount — total active employees in your tenant.",
          "Present / Late / Absent / On leave — today's attendance breakdown.",
          "Unmarked — employees with no punch record yet today.",
          "Open shifts — punch-in without matching punch-out.",
          "Pending leave — requests awaiting your approval.",
          "Regularizations — attendance correction requests in queue.",
        ],
      },
      {
        id: "workflows",
        title: "Key workflows",
        workflows: [
          {
            title: "Review something that needs attention",
            steps: [
              "Scan the Needs attention card for alerts (pending leave, open shifts, etc.).",
              "Click the linked module (Leave, Attendance, etc.) to take action.",
              "Return to the dashboard to confirm counts have cleared.",
            ],
          },
          {
            title: "Jump to a module quickly",
            steps: [
              "Use stat cards or quick-action buttons to open Employees, Attendance, or Leave.",
              "Filters on target pages may pre-apply based on the link context.",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Check the dashboard each morning before approving leave or running payroll.",
          "Investigate open shifts daily — they may indicate forgotten punch-out.",
          "Use pending regularization count as a weekly hygiene metric.",
        ],
      },
    ],
  },
  {
    slug: "employees",
    title: "Employees",
    summary:
      "Onboard, manage profiles, login access, compensation, and attendance history.",
    appRoute: "/employees",
    keywords: [
      "onboard",
      "create",
      "deactivate",
      "3PL",
      "profile",
      "login",
      "salary",
      "documents",
      "employee code",
    ],
    relatedSlugs: ["settings", "sites", "shifts"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "The Employees directory is where you create accounts, manage profiles, and control login access. Each employee gets a membership (role + company) and a profile (employment details, site, geofence policy).",
        ],
      },
      {
        id: "setup",
        title: "Before you start",
        steps: [
          "Configure departments and designations in Settings → Organization.",
          "Create at least one active site if you use geofenced attendance.",
          "Define shifts in the shift catalog before assigning roster entries.",
        ],
        callout:
          "If departments or designations are missing, the Add employee form will prompt you to complete Settings first.",
      },
      {
        id: "workflows",
        title: "Key workflows",
        workflows: [
          {
            title: "Add a new employee",
            steps: [
              "Click Add employee in the directory.",
              "Fill name, email, employment type (Permanent, 3PL, Intern, Consultant), department, and designation.",
              "Optionally set primary site, geofence policy, and shift defaults.",
              "Submit — this creates the auth account, team membership, and employee profile in one step.",
              "Share login credentials; employee may be prompted to change password on first login.",
            ],
          },
          {
            title: "Manage an employee profile",
            steps: [
              "Open the employee from the directory.",
              "Profile tab — personal and employment details.",
              "Login & access tab — allow/block login, reset password, view auth status.",
              "Compensation & Docs — salary structure and uploaded documents.",
              "Attendance tab — recent punch history for this employee.",
            ],
          },
          {
            title: "Deactivate or delete",
            steps: [
              "Use Edit or the actions menu from the directory or detail page.",
              "Deactivate to retain history while blocking login and roster assignment.",
              "Delete permanently removes the employee — use only when required by policy.",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Enable employee code auto-generation in Settings for consistent IDs.",
          "Assign a primary site for each field employee to simplify live map views.",
          "Review Login & access after onboarding to confirm the account is active.",
          "Keep 3PL employees linked to the correct vendor in Settings → 3PL providers.",
        ],
      },
    ],
  },
  {
    slug: "sites",
    title: "Sites",
    summary:
      "Geofenced work locations, live on-duty map, and site lifecycle management.",
    appRoute: "/sites",
    keywords: [
      "geofence",
      "location",
      "latitude",
      "longitude",
      "radius",
      "live map",
      "on duty",
    ],
    relatedSlugs: ["employees", "attendance", "settings"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Sites are geofenced work locations. Mobile punch-in validates the employee's GPS against the site radius. The live map shows who is currently on duty at each location.",
        ],
      },
      {
        id: "workflows",
        title: "Key workflows",
        workflows: [
          {
            title: "Create a site",
            steps: [
              "Click Add site and enter a name and address.",
              "Set latitude, longitude, and radius in meters (minimum 20 m).",
              "Use the map picker or browser geolocation to capture coordinates.",
              "Save as Active — inactive sites cannot be used for new assignments.",
            ],
          },
          {
            title: "Monitor live presence",
            steps: [
              "The live map auto-refreshes every 30 seconds.",
              "Expand a site row to see on-duty employees and last punch time.",
              "Click a map marker or Open in Maps for external navigation.",
            ],
          },
          {
            title: "Deactivate or delete",
            steps: [
              "Deactivate to hide from new assignments while keeping history.",
              "Delete removes the site permanently — ensure no active dependencies first.",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Set radius generously at warehouses (100–500 m) and tighter at offices (50–100 m).",
          "Name sites clearly — they appear in attendance filters and employee profiles.",
          "Verify coordinates on-site with a test punch before go-live.",
          "Review the live map during peak hours to confirm geofence accuracy.",
        ],
      },
    ],
  },
  {
    slug: "shifts",
    title: "Shifts",
    summary:
      "Shift catalog, roster assignments, CSV import, and overnight attendance rules.",
    appRoute: "/shifts",
    keywords: [
      "roster",
      "catalog",
      "overnight",
      "cross-midnight",
      "grace",
      "punch window",
      "import",
      "change request",
    ],
    relatedSlugs: ["attendance", "employees", "getting-started"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Shifts define scheduled work windows, punch-in/out allowed times, and grace rules. The shift catalog holds reusable templates; the roster assigns them to employees by date. Attendance is keyed to the shift business date — overnight punch-out stays on the original shift record.",
        ],
      },
      {
        id: "catalog",
        title: "Shift catalog",
        paragraphs: [
          "Create shifts with name, code, type, start/end times, grace minutes, punch windows, and full/half-day thresholds. End time earlier than or equal to start time is treated as cross-midnight (overnight).",
        ],
        steps: [
          "Add a General Day shift (09:00–18:00) as your default.",
          "Add night shifts with end ≤ start (e.g. 16:00–02:00) and increase Out window after for post-midnight checkout.",
          "Use the ? guide icon on the shift form for field-by-field help and example presets.",
        ],
        callout:
          "See the field reference table on this page for detailed input guidance on every catalog field.",
      },
      {
        id: "roster",
        title: "Roster assignments",
        workflows: [
          {
            title: "Assign shifts manually",
            steps: [
              "Open Shifts → Roster.",
              "Pick employee, date, shift, site, and sequence (for multi-shift days).",
              "Save — mobile punch-in resolves the rostered shift for that date first.",
            ],
          },
          {
            title: "Bulk import via CSV",
            steps: [
              "Download the roster template from the Roster page.",
              "Fill employee code, date, shift code, site, and sequence columns.",
              "Upload — invalid rows are reported; fix and re-import as needed.",
            ],
          },
          {
            title: "Monthly matrix view",
            steps: [
              "Open Monthly shift roster for an employee × date grid.",
              "Useful for planning rotational or multi-week schedules.",
            ],
          },
        ],
      },
      {
        id: "change-requests",
        title: "Shift change requests",
        paragraphs: [
          "Employees can request a shift change from mobile. Pending requests appear on the Roster page for admin approval or rejection.",
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Keep shift codes short and unique — they are used in CSV imports.",
          "Roster at least one week ahead so mobile punch resolves correctly.",
          "For overnight shifts, test punch-out after midnight before go-live.",
          "Use sequence numbers when an employee works two shifts in one day.",
        ],
      },
    ],
  },
  {
    slug: "attendance",
    title: "Attendance",
    summary:
      "Daily punch log, regularization queue, monthly register, and mobile punch context.",
    appRoute: "/attendance",
    keywords: [
      "punch",
      "regularization",
      "geofence",
      "open shift",
      "export",
      "CSV",
      "monthly register",
      "late",
      "absent",
    ],
    relatedSlugs: ["shifts", "sites", "leave"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Attendance records are created when employees punch in/out via the mobile app. The web portal is for admins to monitor compliance, export data, and approve regularization (correction) requests.",
        ],
      },
      {
        id: "daily-log",
        title: "Daily log",
        workflows: [
          {
            title: "Filter and review punches",
            steps: [
              "Open Attendance → Daily log.",
              "Set date range, employee, site, status, or geofence filters.",
              "Review Present, Late, Half day, and open-shift rows.",
              "Export CSV for payroll or audit if needed.",
            ],
          },
          {
            title: "Handle regularizations",
            steps: [
              "Switch to the Regularizations tab.",
              "Review employee-submitted correction requests with reason and requested times.",
              "Approve to update the attendance record, or reject with feedback.",
            ],
          },
        ],
      },
      {
        id: "monthly-register",
        title: "Monthly register",
        paragraphs: [
          "The monthly register shows an employee × day grid with attendance status. Filter by department, branch, or designation for team-level reviews.",
        ],
        steps: [
          "Open Attendance → Monthly register.",
          "Select month and org filters.",
          "Scan for patterns: repeated late marks, absences, or half-days.",
        ],
      },
      {
        id: "mobile-punch",
        title: "How mobile punch works",
        bullets: [
          "Employee must be within the assigned site's geofence radius.",
          "Punch-in resolves the rostered shift for today (or yesterday for overnight windows).",
          "Late status applies after scheduled start + late grace minutes.",
          "Punch-out finalizes total minutes, half-day/full-day status, and overtime.",
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Clear open shifts weekly — often a forgotten punch-out.",
          "Process regularizations within 48 hours to keep payroll accurate.",
          "Cross-check monthly register before running payroll for the month.",
          "Use geofence filter to audit remote or off-site punch attempts.",
        ],
      },
    ],
  },
  {
    slug: "leave",
    title: "Leave",
    summary:
      "Leave types, balances, approvals, holidays, and annual assignments.",
    appRoute: "/leave",
    keywords: [
      "apply",
      "approve",
      "balance",
      "holiday",
      "leave type",
      "assignment",
      "pending",
    ],
    relatedSlugs: ["attendance", "payroll", "employees"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Leave management covers employee time-off requests, admin approvals, leave type configuration, holiday calendar, and annual balance assignments. Admins see four tabs; employees see balances, apply form, and holidays only.",
        ],
      },
      {
        id: "workflows",
        title: "Key workflows",
        workflows: [
          {
            title: "Configure leave types and holidays",
            steps: [
              "Open Leave → Configure tab.",
              "Add leave types (e.g. Casual, Sick, Earned) with accrual rules.",
              "Add company holidays for the year.",
            ],
          },
          {
            title: "Assign annual balances",
            steps: [
              "Open Leave → Assignments tab.",
              "Select employee, leave type, and opening balance for the year.",
              "Save — balances decrement when leave is approved.",
            ],
          },
          {
            title: "Approve or reject requests",
            steps: [
              "Open Leave → Approvals tab.",
              "Review pending requests with dates, type, and reason.",
              "Approve to mark employee on leave for those dates; reject to notify employee.",
            ],
          },
          {
            title: "Apply for your own leave (admin)",
            steps: [
              "Use the My leave tab to view balances and submit a request.",
              "Another admin must approve if your tenant requires dual approval.",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Set up leave types and holidays before assigning annual balances.",
          "Assign opening balances at the start of each calendar year.",
          "Approved leave reflects on the dashboard On leave count and in payroll payable days.",
          "Keep the holiday calendar updated before employees plan time off.",
        ],
      },
    ],
  },
  {
    slug: "payroll",
    title: "Payroll",
    summary:
      "Monthly payroll runs, payable days, bank CSV export, and payslip printing.",
    appRoute: "/payroll",
    keywords: [
      "payslip",
      "run",
      "finalize",
      "bank CSV",
      "payable days",
      "deductions",
      "net pay",
    ],
    relatedSlugs: ["attendance", "leave", "employees"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Payroll computes monthly pay for permanent employees using attendance and approved leave. Payable days are derived from a 22 working-day base. After finalizing a run, download bank CSV and print individual payslips.",
        ],
      },
      {
        id: "workflows",
        title: "Key workflows",
        workflows: [
          {
            title: "Run monthly payroll",
            steps: [
              "Open Payroll and select the target month.",
              "Review employee count and preview totals.",
              "Run payroll — system computes payable days from attendance + approved leave.",
              "Review the run summary before finalizing.",
              "Finalize to lock the run; payslips are generated per employee.",
            ],
          },
          {
            title: "Download bank CSV and payslips",
            steps: [
              "From Past runs, click the month link to open payslips.",
              "Download bank CSV for NEFT/bulk transfer.",
              "Print individual payslip cards (gross, deductions, net) per employee.",
            ],
          },
        ],
      },
      {
        id: "payable-days",
        title: "How payable days work",
        bullets: [
          "Base: 22 working days per month (configurable at company level).",
          "Present and approved leave days count toward payable days.",
          "Unmarked absences and unpaid leave reduce payable days.",
          "Run payroll only after attendance and leave for the month are reconciled.",
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Close all regularizations and leave approvals before running payroll.",
          "Cross-check the monthly attendance register against the payroll preview.",
          "Finalize only when totals are verified — finalized runs are locked.",
          "Store bank CSV and payslip exports per your statutory retention policy.",
        ],
      },
    ],
  },
  {
    slug: "settings",
    title: "Settings",
    summary:
      "Timezone, organization structure, 3PL vendors, and branding — each tab saves independently.",
    appRoute: "/settings",
    keywords: [
      "timezone",
      "currency",
      "department",
      "designation",
      "employee code",
      "3PL",
      "vendor",
      "branding",
      "logo",
    ],
    relatedSlugs: ["getting-started", "employees", "payroll"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Settings configure tenant-wide defaults that gate other modules. Each tab (General, Organization, 3PL providers, Branding) saves independently — you do not need to fill all tabs at once.",
        ],
      },
      {
        id: "tabs",
        title: "Tab guide",
        workflows: [
          {
            title: "General",
            steps: [
              "Set timezone — drives shift windows, attendance dates, and payroll month boundaries.",
              "Set currency and work week (e.g. Mon–Fri).",
              "Add jurisdictions if you operate across regions.",
            ],
          },
          {
            title: "Organization",
            steps: [
              "Add departments and designations — required before creating employees.",
              "Configure employee code prefix, padding, and auto-generate toggle.",
              "Adjust next sequence if migrating from another system.",
            ],
          },
          {
            title: "3PL providers",
            steps: [
              "Register third-party payroll vendors for 3PL employee types.",
              "Link vendors when onboarding 3PL staff in Employees.",
            ],
          },
          {
            title: "Branding",
            steps: [
              "Set primary color, logo URL, and email sender name.",
              "Branding appears in portal theming and outbound email context.",
            ],
          },
        ],
      },
      {
        id: "downstream",
        title: "What each setting gates",
        bullets: [
          "Timezone → shift punch windows, attendance business dates, payroll month.",
          "Departments / designations → employee creation form.",
          "Employee code settings → auto-generated IDs on new hires.",
          "3PL vendors → 3PL employment type on employee profiles.",
          "Branding → portal accent and email sender display name.",
        ],
      },
      {
        id: "best-practices",
        title: "Best practices",
        bullets: [
          "Set timezone first — changing it later affects historical attendance interpretation.",
          "Keep department and designation lists short and stable.",
          "Use consistent employee code prefixes (e.g. EMP, ACME).",
          "Save each tab after edits; there is no global Save all button.",
        ],
      },
    ],
  },
];

export function getHelpModule(slug: string): HelpModule | undefined {
  return TENANT_HELP_MODULES.find((m) => m.slug === slug);
}

export function getHelpModuleSlugs(): string[] {
  return TENANT_HELP_MODULES.map((m) => m.slug);
}

export function getHelpModulesExcept(slug: string): HelpModule[] {
  return TENANT_HELP_MODULES.filter((m) => m.slug !== slug);
}
