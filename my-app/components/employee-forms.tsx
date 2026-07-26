'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  FormError,
  FormField,
  FormSelect,
  FormSuccess,
} from '@/components/form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  createEmployeeAction,
  updateEmployeeAction,
  upsertSalaryStructureAction,
} from '@/lib/appwrite/phase1-actions';
import {
  ATTENDANCE_POLICY_LABELS,
  maskAadhaar,
  maskBankAccount,
  type EmployeeMembership,
  type SalaryStructure,
  type Site,
  type ThreePlVendor,
  type WorkShift,
} from '@/lib/appwrite/types';
import { formatShiftWindowLabel } from '@/lib/attendance-shift';
import { salaryAmountsFromComponents, zeroSalaryAmounts } from '@/lib/salary-structure';

type OrgConfig = {
  departments: string[];
  designations: string[];
};

export type EmployeeCodeFormConfig = {
  autoGenerate: boolean;
  suggestedCode: string;
  prefix: string;
};

function buildOrgOptions(configured: string[], currentValue?: string) {
  const options = [...configured];
  const trimmed = currentValue?.trim();
  if (trimmed && !options.includes(trimmed)) {
    options.unshift(trimmed);
  }
  return options;
}

function OrgSelectField({
  name,
  label,
  options,
  defaultValue,
  emptyHint,
}: {
  name: 'department' | 'designation';
  label: string;
  options: string[];
  defaultValue?: string;
  emptyHint: string;
}) {
  const fieldKey = `${name}-${options.join('|')}-${defaultValue ?? ''}`;

  if (options.length === 0) {
    return (
      <div className="grid gap-2">
        <label className="text-sm font-medium">{label}</label>
        <p className="text-xs text-muted-foreground">
          {emptyHint}{' '}
          <Link href="/settings" className="font-medium text-foreground underline underline-offset-4">
            Company settings → Organization
          </Link>
          .
        </p>
        <input type="hidden" name={name} value="" />
      </div>
    );
  }

  return (
    <FormSelect
      key={fieldKey}
      name={name}
      label={label}
      placeholder={`Select ${label.toLowerCase()}`}
      defaultValue={defaultValue}
      required
      options={options}
    />
  );
}

function DepartmentField({
  departments,
  defaultValue,
}: {
  departments: string[];
  defaultValue?: string;
}) {
  const options = useMemo(
    () => buildOrgOptions(departments, defaultValue),
    [departments, defaultValue],
  );

  return (
    <OrgSelectField
      name="department"
      label="Department"
      options={options}
      defaultValue={defaultValue}
      emptyHint="Add departments under"
    />
  );
}

function DesignationField({
  designations,
  defaultValue,
}: {
  designations: string[];
  defaultValue?: string;
}) {
  const options = useMemo(
    () => buildOrgOptions(designations, defaultValue),
    [designations, defaultValue],
  );

  return (
    <OrgSelectField
      name="designation"
      label="Designation"
      options={options}
      defaultValue={defaultValue}
      emptyHint="Add designations under"
    />
  );
}

function ThreePlVendorField({
  vendors,
  defaultValue,
  required,
}: {
  vendors: ThreePlVendor[];
  defaultValue?: string;
  required?: boolean;
}) {
  const activeVendors = vendors.filter((vendor) => vendor.status === 'active');

  if (activeVendors.length === 0) {
    return (
      <div className="sm:col-span-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        No 3PL providers configured. Add providers under Company settings before creating 3PL
        employees.
      </div>
    );
  }

  return (
    <FormSelect
      name="vendorId"
      label="3PL manpower provider"
      placeholder="Select provider"
      defaultValue={defaultValue}
      required={required}
      className="sm:col-span-2"
      options={activeVendors.map((vendor) => ({
        value: vendor.id,
        label: vendor.contactName
          ? `${vendor.name} (${vendor.contactName})`
          : vendor.name,
      }))}
    />
  );
}

function ShiftSelectField({
  shifts,
  defaultValue,
}: {
  shifts: WorkShift[];
  defaultValue?: string;
}) {
  const active = shifts.filter((shift) => shift.status === 'active');
  return (
    <FormSelect
      name="shiftId"
      label="Assigned shift"
      className="sm:col-span-2"
      placeholder="Custom hours (use start/end below)"
      defaultValue={defaultValue || ''}
      required
      options={active.map((shift) => ({
        value: shift.id,
        label: `${shift.name} · ${formatShiftWindowLabel(shift)}`,
      }))}
    />
  );
}

export function CreateEmployeeForm({
  sites,
  shifts = [],
  orgConfig,
  vendors,
  employeeCodeConfig,
  onSuccess,
  redirectOnSuccess = true,
}: {
  sites: Site[];
  shifts?: WorkShift[];
  orgConfig: OrgConfig;
  vendors: ThreePlVendor[];
  employeeCodeConfig: EmployeeCodeFormConfig;
  onSuccess?: (employeeId: string) => void;
  redirectOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const orgConfigured =
    orgConfig.departments.length > 0 && orgConfig.designations.length > 0;
  const [employmentType, setEmploymentType] = useState<string>('Permanent');
  const [attendancePolicy, setAttendancePolicy] = useState<string>('geofenced');
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await createEmployeeAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onSuccess?.(result.employeeId);
          router.refresh();
          if (redirectOnSuccess) {
            router.push(`/employees/${result.employeeId}`);
          }
        });
      }}
    >
      <FormField name="name" label="Full name" required />
      <FormField name="email" label="Work email" type="email" required />
      <FormField
        name="password"
        label="Temp password"
        type="password"
        required
        minLength={8}
      />
      {employeeCodeConfig.autoGenerate ? (
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="employeeCode-preview">Employee code</Label>
          <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-muted/30 px-3 py-2 dark:border-slate-800">
            <span
              id="employeeCode-preview"
              className="font-mono text-sm font-semibold tracking-tight"
            >
              {employeeCodeConfig.suggestedCode}
            </span>
            <Badge variant="outline" className="text-[10px]">
              Next on save
            </Badge>
          </div>
          <input type="hidden" name="employeeCode" value="" />
          <p className="text-xs text-muted-foreground">
            Uses prefix{' '}
            <span className="font-mono text-foreground">{employeeCodeConfig.prefix}</span>{' '}
            from{' '}
            <Link
              href="/settings"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Company settings → Organization
            </Link>
            . The sequence advances after each employee is created.
          </p>
        </div>
      ) : (
        <FormField
          name="employeeCode"
          label="Employee code"
          placeholder="Required"
          required
        />
      )}
      <FormSelect
        name="employmentType"
        label="Employment type"
        options={['Permanent', '3PL', 'Intern', 'Consultant']}
        defaultValue="Permanent"
        onValueChange={setEmploymentType}
      />
      <DepartmentField departments={orgConfig.departments} />
      <DesignationField designations={orgConfig.designations} />
      {employmentType === '3PL' ? (
        <ThreePlVendorField vendors={vendors} required />
      ) : null}
      <FormField name="phone" label="Phone" required />
      <FormSelect
        name="attendancePolicy"
        label="Attendance policy"
        options={Object.entries(ATTENDANCE_POLICY_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        defaultValue="geofenced"
        onValueChange={setAttendancePolicy}
      />
      <ShiftSelectField shifts={shifts} />
      <FormField name="workShiftStart" label="Fallback start" defaultValue="09:00" required />
      <FormField name="workShiftEnd" label="Fallback end" defaultValue="18:00" required />
      <FormSelect
        name="primarySiteId"
        label="Primary site"
        className="sm:col-span-2"
        placeholder="Unassigned"
        options={sites.map((s) => ({ value: s.id, label: s.name }))}
        required={attendancePolicy === 'geofenced'}
      />
      {attendancePolicy === 'gps_logged' ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Field employees can punch from any location. GPS is logged for audit; geofence is not
          enforced. Assigning a primary site is optional but helps show a reference location in the
          app.
        </p>
      ) : attendancePolicy === 'manual' ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Self punch is disabled in the mobile app. HR or a manager must mark attendance or approve
          regularization.
        </p>
      ) : null}
      <div className="sm:col-span-2">
        {!orgConfigured ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Configure{' '}
            <Link href="/settings" className="font-medium text-foreground underline underline-offset-4">
              departments and designations
            </Link>{' '}
            in company settings before creating employees.
          </p>
        ) : null}
        {shifts.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Optional: create overnight-capable shifts in{' '}
            <Link href="/shifts" className="font-medium text-foreground underline underline-offset-4">
              Shifts
            </Link>
            . Until then, fallback start/end hours are used (end ≤ start = overnight).
          </p>
        ) : null}
        <FormError message={error} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || !orgConfigured}>
          {pending ? 'Creating…' : 'Create employee'}
        </Button>
      </div>
    </form>
  );
}

export function EditEmployeeForm({
  employee,
  sites,
  shifts = [],
  orgConfig,
  vendors,
  onSuccess,
  showExtendedFields = true,
}: {
  employee: EmployeeMembership;
  sites: Site[];
  shifts?: WorkShift[];
  orgConfig: OrgConfig;
  vendors: ThreePlVendor[];
  onSuccess?: () => void;
  showExtendedFields?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [employmentType, setEmploymentType] = useState<string>(
    employee.employmentType || 'Permanent',
  );
  const [attendancePolicy, setAttendancePolicy] = useState<string>(
    employee.attendancePolicy || 'geofenced',
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setOk(false);
        startTransition(async () => {
          const result = await updateEmployeeAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOk(true);
          onSuccess?.();
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="employeeId" value={employee.id} />
      <FormField name="name" label="Full name" defaultValue={employee.name} required />
      <FormField
        name="employeeCode"
        label="Employee code"
        defaultValue={employee.employeeCode}
      />
      <FormSelect
        name="employmentType"
        label="Employment type"
        options={['Permanent', '3PL', 'Intern', 'Consultant']}
        defaultValue={employee.employmentType || 'Permanent'}
        onValueChange={setEmploymentType}
      />
      <FormSelect
        name="status"
        label="Status"
        options={['active', 'inactive', 'invited']}
        defaultValue={employee.status}
      />
      <DepartmentField departments={orgConfig.departments} defaultValue={employee.department} />
      <DesignationField
        designations={orgConfig.designations}
        defaultValue={employee.designation}
      />
      {employmentType === '3PL' ? (
        <ThreePlVendorField vendors={vendors} defaultValue={employee.vendorId} required />
      ) : null}
      <FormField name="phone" label="Phone" defaultValue={employee.phone} />
      <FormSelect
        name="attendancePolicy"
        label="Attendance policy"
        options={Object.entries(ATTENDANCE_POLICY_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        defaultValue={employee.attendancePolicy || 'geofenced'}
        onValueChange={setAttendancePolicy}
      />
      <FormField
        name="dateOfJoining"
        label="Date of joining"
        defaultValue={employee.dateOfJoining}
      />
      <ShiftSelectField shifts={shifts} defaultValue={employee.shiftId} />
      <FormField
        name="workShiftStart"
        label="Fallback start"
        defaultValue={employee.workShiftStart}
      />
      <FormField
        name="workShiftEnd"
        label="Fallback end"
        defaultValue={employee.workShiftEnd}
      />
      <FormSelect
        name="primarySiteId"
        label="Primary site"
        className="sm:col-span-2"
        placeholder="Unassigned"
        defaultValue={employee.primarySiteId}
        options={sites.map((s) => ({ value: s.id, label: s.name }))}
        required={attendancePolicy === 'geofenced'}
      />
      {attendancePolicy === 'gps_logged' ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Field employees can punch from any location. GPS is logged for audit.
        </p>
      ) : attendancePolicy === 'manual' ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Self punch is disabled in the mobile app for this employee.
        </p>
      ) : null}
      {showExtendedFields ? (
        <>
          <FormField name="panNumber" label="PAN" defaultValue={employee.panNumber} />
          <FormField
            name="aadhaarNumber"
            label={`Aadhaar (stored; shown ${maskAadhaar(employee.aadhaarNumber) || 'empty'})`}
            defaultValue={employee.aadhaarNumber}
          />
          <FormField name="uanNumber" label="UAN" defaultValue={employee.uanNumber} />
          <FormField name="esiNumber" label="ESI" defaultValue={employee.esiNumber} />
          <FormField name="bankName" label="Bank name" defaultValue={employee.bankName} />
          <FormField name="bankIfsc" label="IFSC" defaultValue={employee.bankIfsc} />
          <FormField
            name="bankAccountNumber"
            label={`Account (${maskBankAccount(employee.bankAccountNumber) || 'empty'})`}
            defaultValue={employee.bankAccountNumber}
          />
          <FormField
            name="emergencyContactName"
            label="Emergency contact"
            defaultValue={employee.emergencyContactName}
          />
          <FormField
            name="emergencyContactPhone"
            label="Emergency phone"
            defaultValue={employee.emergencyContactPhone}
          />
          <FormField name="pfAccountNumber" label="PF account" defaultValue={employee.pfAccountNumber} />
          <FormField name="dateOfBirth" label="Date of birth" defaultValue={employee.dateOfBirth} />
          <FormField name="gender" label="Gender" defaultValue={employee.gender} />
          <FormField name="bloodGroup" label="Blood group" defaultValue={employee.bloodGroup} />
          <FormField name="grade" label="Grade" defaultValue={employee.grade} />
          <FormField name="costCenter" label="Cost center" defaultValue={employee.costCenter} />
          <FormField
            name="currentAddressLine1"
            label="Address line 1"
            defaultValue={employee.currentAddressLine1}
            className="sm:col-span-2"
          />
          <FormField
            name="currentAddressLine2"
            label="Address line 2"
            defaultValue={employee.currentAddressLine2}
            className="sm:col-span-2"
          />
          <FormField name="currentCity" label="City" defaultValue={employee.currentCity} />
          <FormField name="currentState" label="State" defaultValue={employee.currentState} />
          <FormField name="currentPincode" label="Pincode" defaultValue={employee.currentPincode} />
        </>
      ) : null}
      <div className="sm:col-span-2 space-y-2">
        <FormError message={error} />
        <FormSuccess message={ok ? 'Saved.' : null} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
}

export function SalaryStructureForm({
  employeeId,
  salary,
}: {
  employeeId: string;
  salary?: SalaryStructure | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const amounts = salary?.components
    ? salaryAmountsFromComponents(salary.components)
    : zeroSalaryAmounts();
  const effectiveFrom = salary?.effectiveFrom || today;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setOk(false);
        startTransition(async () => {
          const result = await upsertSalaryStructureAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <FormField
        name="effectiveFrom"
        label="Effective from"
        type="date"
        defaultValue={effectiveFrom}
        required
      />
      <FormField name="basic" label="Basic" type="number" defaultValue={String(amounts.basic)} min={0} />
      <FormField name="hra" label="HRA" type="number" defaultValue={String(amounts.hra)} min={0} />
      <FormField
        name="specialAllowance"
        label="Special allowance"
        type="number"
        defaultValue={String(amounts.specialAllowance)}
        min={0}
      />
      <FormField
        name="otherEarnings"
        label="Other earnings"
        type="number"
        defaultValue={String(amounts.otherEarnings)}
        min={0}
      />
      <FormField
        name="deductions"
        label="Deductions"
        type="number"
        defaultValue={String(amounts.deductions)}
        min={0}
      />
      <div className="sm:col-span-2 space-y-2">
        <FormError message={error} />
        <FormSuccess message={ok ? 'Salary structure saved.' : null} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? 'Saving…' : 'Save salary structure'}
        </Button>
      </div>
    </form>
  );
}
