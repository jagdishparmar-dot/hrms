'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  FormError,
  FormField,
  FormSelect,
  FormSuccess,
  FormTextarea,
} from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  applyLeaveAction,
  assignLeaveBalanceAction,
  reviewLeaveAction,
  upsertHolidayAction,
  upsertLeaveTypeAction,
} from '@/lib/appwrite/phase1-actions';
import type {
  EmployeeMembership,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
} from '@/lib/appwrite/types';

export function LeaveApplyForm({ types }: { types: LeaveType[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setOk(false);
        startTransition(async () => {
          const result = await applyLeaveAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}>
      <FormSelect
        name="leaveTypeId"
        label="Leave type"
        placeholder="Leave type"
        required
        options={types.map((t) => ({ value: t.id, label: t.name }))}
      />
      <FormField name="fromDate" label="From date" type="date" required />
      <FormField name="toDate" label="To date" type="date" required />
      <FormTextarea name="note" label="Note (optional)" placeholder="Optional note" />
      <FormError message={error} />
      <FormSuccess message={ok ? 'Leave request submitted.' : null} />
      <Button type="submit" disabled={pending || types.length === 0}>
        {pending ? 'Submitting…' : 'Apply'}
      </Button>
    </form>
  );
}

export function LeaveReviewList({ items }: { items: LeaveRequest[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending requests.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="space-y-2">
            <p className="font-semibold">
              {item.employeeName} · {item.leaveTypeName}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.fromDate} → {item.toDate} ({item.days} days)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set('leaveRequestId', item.id);
                  fd.set('decision', 'approved');
                  startTransition(async () => {
                    await reviewLeaveAction(fd);
                    router.refresh();
                  });
                }}>
                Approve
              </Button>
              <Button
                type="button"
                disabled={pending}
                variant="outline"
                onClick={() => {
                  const fd = new FormData();
                  fd.set('leaveRequestId', item.id);
                  fd.set('decision', 'rejected');
                  startTransition(async () => {
                    await reviewLeaveAction(fd);
                    router.refresh();
                  });
                }}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}

export function LeaveAdminForms({
  types,
  holidays,
}: {
  types: LeaveType[];
  holidays: Holiday[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set('paid', 'true');
          setError(null);
          startTransition(async () => {
            const result = await upsertLeaveTypeAction(fd);
            if (!result.ok) {
              setError(result.error);
              setMsg(null);
              return;
            }
            setMsg('Leave type saved.');
            setError(null);
            (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}>
        <FormField name="name" label="Name" placeholder="Casual Leave" required />
        <FormField name="code" label="Code" placeholder="CL" required />
        <FormField
          name="accrualPerMonth"
          label="Accrual per month"
          type="number"
          step="0.1"
          defaultValue="1"
        />
        <FormField name="maxBalance" label="Max balance" type="number" defaultValue="12" />
        <Button type="submit" disabled={pending} className="sm:col-span-2">
          Add leave type
        </Button>
      </form>
      <ul className="text-sm text-muted-foreground">
        {types.map((t) => (
          <li key={t.id}>
            {t.code} — {t.name} (accrual {t.accrualPerMonth}/mo)
          </li>
        ))}
      </ul>

      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await upsertHolidayAction(fd);
            if (!result.ok) {
              setError(result.error);
              setMsg(null);
              return;
            }
            setMsg('Holiday saved.');
            setError(null);
            (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}>
        <FormField name="date" label="Date" type="date" required />
        <FormField name="name" label="Holiday name" placeholder="Holiday name" required />
        <FormField
          name="region"
          label="Region (optional)"
          placeholder="Region (optional)"
          className="sm:col-span-2"
        />
        <Button type="submit" disabled={pending} variant="outline" className="sm:col-span-2">
          Add holiday
        </Button>
      </form>
      <ul className="text-sm text-muted-foreground">
        {holidays.map((h) => (
          <li key={h.id}>
            {h.date} — {h.name}
          </li>
        ))}
      </ul>
      <FormError message={error} />
      <FormSuccess message={msg} />
    </div>
  );
}

export function LeaveAssignmentForm({
  employees,
  types,
  assignments,
}: {
  employees: EmployeeMembership[];
  types: LeaveType[];
  assignments: Array<
    LeaveBalance & { employeeName?: string; leaveTypeName?: string; leaveTypeCode?: string }
  >;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          setOk(false);
          startTransition(async () => {
            const result = await assignLeaveBalanceAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOk(true);
            router.refresh();
          });
        }}>
        <FormSelect
          name="employeeId"
          label="Employee"
          placeholder="Select employee"
          required
          options={employees.map((e) => ({
            value: e.id,
            label: `${e.name}${e.employeeCode ? ` (${e.employeeCode})` : ''}`,
          }))}
        />
        <FormSelect
          name="leaveTypeId"
          label="Leave type"
          placeholder="Select leave type"
          required
          options={types
            .filter((t) => t.status === 'active')
            .map((t) => ({ value: t.id, label: `${t.code} — ${t.name}` }))}
        />
        <FormField
          name="year"
          label="Year"
          type="number"
          defaultValue={String(currentYear)}
          required
        />
        <FormField
          name="balance"
          label="Balance (days)"
          type="number"
          step="0.5"
          min="0"
          defaultValue="0"
          required
        />
        <FormError message={error} />
        <FormSuccess message={ok ? 'Leave balance saved.' : null} />
        <Button type="submit" disabled={pending} className="sm:col-span-2">
          {pending ? 'Saving…' : 'Save assignment'}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Leave type</th>
              <th className="px-3 py-2 font-medium">Year</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2">{row.employeeName || row.employeeId}</td>
                <td className="px-3 py-2">
                  {row.leaveTypeCode ? `${row.leaveTypeCode} — ` : ''}
                  {row.leaveTypeName || row.leaveTypeId}
                </td>
                <td className="px-3 py-2 tabular-nums">{row.year}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {row.balance}
                </td>
              </tr>
            ))}
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No leave balances assigned yet for {currentYear}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
