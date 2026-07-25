'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  FormError,
  FormField,
  FormSuccess,
} from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { platformProvisionCompanyExtendedAction } from '@/lib/appwrite/platform-actions';

export function PlatformProvisionForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setOk(false);
        startTransition(async () => {
          const result = await platformProvisionCompanyExtendedAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOk(true);
          router.push(`/platform/companies/${result.companyId}`);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField name="companyName" label="Company name" required />
        <FormField
          name="slug"
          label="Slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="acme-corp"
        />
        <FormField name="adminName" label="Admin name" required />
        <FormField name="adminEmail" label="Admin email" type="email" required />
        <FormField
          name="adminPassword"
          label="Temp password"
          type="password"
          required
          minLength={8}
        />
        <FormField name="plan" label="Plan" defaultValue="free" />
        <FormField
          name="maxEmployees"
          label="Max employees"
          type="number"
          defaultValue="50"
        />
        <FormField
          name="timezone"
          label="Timezone"
          defaultValue="Asia/Kolkata"
        />
        <FormField name="currency" label="Currency" defaultValue="INR" />
      </div>
      <FormError message={error} />
      <FormSuccess
        message={ok ? 'Company provisioned. Opening tenant…' : null}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Provisioning…' : 'Create company'}
      </Button>
    </form>
  );
}
