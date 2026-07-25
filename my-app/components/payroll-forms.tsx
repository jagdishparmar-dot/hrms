'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FormError, FormField, FormSuccess } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { exportBankCsvAction, runPayrollAction } from '@/lib/appwrite/phase1-actions';
import type { PayrollRun } from '@/lib/appwrite/types';

export function PayrollForms({
  defaultMonth,
  runs,
}: {
  defaultMonth: string;
  runs: PayrollRun[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = runs[0];

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          setOk(null);
          startTransition(async () => {
            const result = await runPayrollAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOk(`Payroll finalized (${result.payrollRunId}).`);
            router.refresh();
          });
        }}>
        <FormField name="month" label="Payroll month" type="month" defaultValue={defaultMonth} required />
        <Button type="submit" disabled={pending}>
          {pending ? 'Running…' : 'Run & finalize payroll'}
        </Button>
      </form>

      {latest ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/payroll/${latest.id}/payslips`} />}
          >
            View payslips ({latest.month})
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await exportBankCsvAction(latest.id);
                if (!result.ok) {
                  setError('Export failed');
                  return;
                }
                const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bank-export-${latest.month}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                setOk('Bank CSV downloaded.');
              });
            }}>
            Download bank CSV
          </Button>
        </div>
      ) : null}

      <FormError message={error} />
      <FormSuccess message={ok} />
    </div>
  );
}
