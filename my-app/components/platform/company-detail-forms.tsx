'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  FormCheckbox,
  FormError,
  FormField,
  FormSuccess,
} from '@/components/form-fields';
import { ConfirmStatusDialog } from '@/components/platform/confirm-status-dialog';
import {
  PlatformStatusBadge,
  PlatformTableShell,
} from '@/components/platform/platform-section';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  updatePlatformCompanyAction,
  updatePlatformCompanyConfigAction,
} from '@/lib/appwrite/platform-actions';
import type { AuditLog, Company, EmployeeMembership } from '@/lib/appwrite/types';
import { DEFAULT_MODULES } from '@/lib/appwrite/types';

export function PlatformCompanyLifecycle({ company }: { company: Company }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PlatformStatusBadge status={company.status} />
      {company.status !== 'active' ? (
        <ConfirmStatusDialog
          companyId={company.id}
          slug={company.slug}
          status="active"
        />
      ) : null}
      {company.status === 'active' ? (
        <ConfirmStatusDialog
          companyId={company.id}
          slug={company.slug}
          status="suspended"
          variant="destructive"
        />
      ) : null}
      {company.status !== 'archived' ? (
        <ConfirmStatusDialog
          companyId={company.id}
          slug={company.slug}
          status="archived"
          variant="secondary"
        />
      ) : null}
    </div>
  );
}

export function PlatformCompanyPlanForm({ company }: { company: Company }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setOk(false);
        startTransition(async () => {
          const result = await updatePlatformCompanyAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="companyId" value={company.id} />
      <input type="hidden" name="status" value={company.status} />
      <FormField name="name" label="Company name" defaultValue={company.name} required />
      <FormField name="plan" label="Subscription plan" defaultValue={company.plan} required />
      <FormField
        name="maxEmployees"
        label="Max employees"
        type="number"
        defaultValue={String(company.maxEmployees)}
        required
      />
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium">Feature flags</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormCheckbox
            name="geofencing"
            label="Geofencing"
            defaultChecked={company.featureFlags.geofencing}
          />
          <FormCheckbox
            name="payroll3pl"
            label="3PL payroll"
            defaultChecked={company.featureFlags.payroll3pl}
          />
          <FormCheckbox
            name="selfiePunch"
            label="Selfie punch"
            defaultChecked={company.featureFlags.selfiePunch}
          />
          <FormCheckbox
            name="sso"
            label="SSO"
            defaultChecked={company.featureFlags.sso}
          />
        </div>
      </div>
      <div className="sm:col-span-2 space-y-2">
        <FormError message={error} />
        <FormSuccess message={ok ? 'Plan & flags saved.' : null} />
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save subscription'}
        </Button>
      </div>
    </form>
  );
}

export function PlatformCompanyConfigForm({ company }: { company: Company }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const modules = { ...DEFAULT_MODULES, ...(company.settings.modules || {}) };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setOk(false);
        startTransition(async () => {
          const result = await updatePlatformCompanyConfigAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="companyId" value={company.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField name="name" label="Display name" defaultValue={company.name} required />
        <FormField
          name="legalName"
          label="Legal name"
          defaultValue={company.settings.legalName || ''}
        />
        <FormField name="gstin" label="GSTIN / Tax ID" defaultValue={company.settings.gstin || ''} />
        <FormField
          name="contactEmail"
          label="Business email"
          type="email"
          defaultValue={company.settings.contactEmail || ''}
        />
        <FormField
          name="contactPhone"
          label="Business phone"
          defaultValue={company.settings.contactPhone || ''}
        />
        <FormField
          name="registeredAddress"
          label="Registered address"
          className="sm:col-span-2"
          defaultValue={company.settings.registeredAddress || ''}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          name="timezone"
          label="Timezone"
          defaultValue={company.settings.timezone}
          required
        />
        <FormField
          name="currency"
          label="Currency"
          defaultValue={company.settings.currency}
          required
        />
        <FormField
          name="workWeek"
          label="Work week (csv)"
          defaultValue={company.settings.workWeek.join(',')}
          required
        />
        <FormField
          name="jurisdictions"
          label="Jurisdictions (csv)"
          defaultValue={company.settings.jurisdictions.join(',')}
          required
        />
        <FormField
          name="lateGraceMinutes"
          label="Late grace (minutes)"
          type="number"
          defaultValue={String(company.settings.lateGraceMinutes ?? 15)}
        />
        <FormField
          name="payCycleDay"
          label="Pay cycle day"
          type="number"
          defaultValue={String(company.settings.payCycleDay ?? 1)}
        />
        <FormField
          name="dataRetentionDays"
          label="Data retention (days)"
          type="number"
          defaultValue={String(company.settings.dataRetentionDays ?? 365)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          name="logoUrl"
          label="Logo URL"
          defaultValue={company.branding.logoUrl}
        />
        <FormField
          name="primaryColor"
          label="Primary color"
          defaultValue={company.branding.primaryColor}
        />
        <FormField
          name="emailSenderName"
          label="Email sender name"
          defaultValue={company.branding.emailSenderName}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Module access</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <FormCheckbox name="moduleAttendance" label="Attendance" defaultChecked={modules.attendance} />
          <FormCheckbox name="moduleLeave" label="Leave" defaultChecked={modules.leave} />
          <FormCheckbox name="modulePayroll" label="Payroll" defaultChecked={modules.payroll} />
          <FormCheckbox name="moduleShifts" label="Shifts" defaultChecked={modules.shifts} />
          <FormCheckbox name="moduleDocuments" label="Documents" defaultChecked={modules.documents} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Operational flags</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormCheckbox name="geofencing" label="Geofencing" defaultChecked={company.featureFlags.geofencing} />
          <FormCheckbox name="payroll3pl" label="3PL payroll" defaultChecked={company.featureFlags.payroll3pl} />
          <FormCheckbox name="selfiePunch" label="Selfie punch" defaultChecked={company.featureFlags.selfiePunch} />
          <FormCheckbox name="sso" label="SSO" defaultChecked={company.featureFlags.sso} />
        </div>
      </div>

      <FormError message={error} />
      <FormSuccess message={ok ? 'Configuration saved. Change is audited.' : null} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save configuration'}
      </Button>
    </form>
  );
}

export function PlatformCompanyUsersTable({
  memberships,
}: {
  memberships: EmployeeMembership[];
}) {
  return (
    <PlatformTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Role
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((m) => (
            <TableRow key={m.id} className="border-border/60 hover:bg-muted/30">
              <TableCell>
                <div className="font-semibold text-foreground">{m.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {m.email}
                </div>
              </TableCell>
              <TableCell className="capitalize">{m.role.replaceAll('_', ' ')}</TableCell>
              <TableCell>
                <PlatformStatusBadge status={m.status} />
              </TableCell>
            </TableRow>
          ))}
          {memberships.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No users listed.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </PlatformTableShell>
  );
}

export function PlatformAuditTable({ logs }: { logs: AuditLog[] }) {
  return (
    <PlatformTableShell>
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              When
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Actor
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="border-border/60 hover:bg-muted/30">
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {log.$createdAt
                  ? new Date(log.$createdAt).toLocaleString()
                  : '—'}
              </TableCell>
              <TableCell>
                <div className="font-semibold text-foreground">{log.action}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-rose-300/90">
                {log.actorUserId.slice(0, 12)}…
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No audit events yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </PlatformTableShell>
  );
}
