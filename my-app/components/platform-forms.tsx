'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  FormCheckbox,
  FormError,
  FormField,
  FormSelect,
} from '@/components/form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
/** @deprecated Prefer `@/components/platform/provision-form` */
export { PlatformProvisionForm } from '@/components/platform/provision-form';
import { updateCompanyPlanAction } from '@/lib/appwrite/actions';
import type { Company } from '@/lib/appwrite/types';

export function PlatformCompanyCard({ company }: { company: Company }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{company.name}</CardTitle>
          <CardDescription>
            {company.slug} · {company.status} · team {company.teamId.slice(0, 8)}…
          </CardDescription>
        </div>
        <Badge variant="secondary">{company.plan}</Badge>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await updateCompanyPlanAction(fd);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}>
          <input type="hidden" name="companyId" value={company.id} />
          <FormField name="plan" label="Plan" defaultValue={company.plan} />
          <FormField
            name="maxEmployees"
            label="Max employees"
            type="number"
            defaultValue={String(company.maxEmployees)}
          />
          <FormSelect
            name="status"
            label="Status"
            defaultValue={company.status}
            options={[
              { value: 'active', label: 'active' },
              { value: 'suspended', label: 'suspended' },
              { value: 'pending', label: 'pending' },
              { value: 'archived', label: 'archived' },
            ]}
          />
          <div className="space-y-2 pt-6 sm:col-span-2">
            <Label>Feature flags</Label>
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
          <div className="sm:col-span-2 space-y-3">
            <FormError message={error} />
            <Button type="submit" disabled={pending} variant="outline">
              {pending ? 'Saving…' : 'Update plan / flags'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
