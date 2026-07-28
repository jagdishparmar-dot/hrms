'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { LeaveApplyForm } from '@/components/leave-forms';
import { updateMyProfilePortalAction } from '@/lib/appwrite/employee-portal-actions';
import type { EmployeeMembership } from '@/lib/appwrite/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONTACT_FIELDS: Array<{ key: keyof EmployeeMembership; label: string }> = [
  { key: 'phone', label: 'Mobile' },
  { key: 'currentAddressLine1', label: 'Address line 1' },
  { key: 'currentAddressLine2', label: 'Address line 2' },
  { key: 'currentCity', label: 'City' },
  { key: 'currentState', label: 'State' },
  { key: 'currentPincode', label: 'Pincode' },
  { key: 'emergencyContactName', label: 'Emergency contact' },
  { key: 'emergencyContactPhone', label: 'Emergency phone' },
];

const PAYROLL_FIELDS: Array<{ key: keyof EmployeeMembership; label: string }> = [
  { key: 'panNumber', label: 'PAN' },
  { key: 'aadhaarNumber', label: 'Aadhaar' },
  { key: 'uanNumber', label: 'UAN' },
  { key: 'esiNumber', label: 'ESI' },
  { key: 'pfAccountNumber', label: 'PF account' },
  { key: 'bankName', label: 'Bank name' },
  { key: 'bankIfsc', label: 'IFSC' },
  { key: 'bankAccountNumber', label: 'Account number' },
];

export function EmployeeProfileForm({
  employee,
  reportingManager,
  officeLocation = '',
}: {
  employee: EmployeeMembership;
  reportingManager: string;
  officeLocation?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
        <h3 className="text-base font-bold">Employment</h3>
        <p className="text-xs text-muted-foreground">Read-only details from HR</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Detail label="Employee ID" value={employee.employeeCode || employee.id} />
          <Detail label="Department" value={employee.department} />
          <Detail label="Role" value={employee.role.replaceAll('_', ' ')} />
          <Detail label="Reporting manager" value={reportingManager || '—'} />
          <Detail label="Work email" value={employee.email} />
          <Detail label="Office / site" value={officeLocation || '—'} />
          <Detail
            label="Shift"
            value={`${employee.workShiftStart} – ${employee.workShiftEnd}`}
          />
          <Detail label="Date of joining" value={employee.dateOfJoining} />
        </div>
      </section>

      <form
        className="flex flex-col gap-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await updateMyProfilePortalAction(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success('Profile updated.');
          });
        }}
      >
        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
          <h3 className="text-base font-bold">Contact & address</h3>
          <p className="text-xs text-muted-foreground">Editable by you</p>
          <div className="mt-4 grid gap-3">
            {CONTACT_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  name={field.key}
                  defaultValue={String(employee[field.key] || '')}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
          <h3 className="text-base font-bold">Payroll & compliance</h3>
          <p className="text-xs text-muted-foreground">
            Keep statutory and bank details current
          </p>
          <div className="mt-4 grid gap-3">
            {PAYROLL_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  name={field.key}
                  defaultValue={String(employee[field.key] || '')}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
            ))}
          </div>
        </section>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl md:w-fit"
        >
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/35 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value?.trim() ? value : '—'}</p>
    </div>
  );
}
