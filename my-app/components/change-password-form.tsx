'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FormError, FormField } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { changePasswordAction } from '@/lib/appwrite/phase1-actions';

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-medium">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Your admin created a temporary password. Choose a new one to continue.
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          startTransition(async () => {
            try {
              const result = await changePasswordAction(fd);
              if (result && !result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            } catch {
              /* server redirect */
            }
          });
        }}
      >
        <FormField
          name="currentPassword"
          label="Current password"
          type="password"
          required
        />
        <FormField
          name="newPassword"
          label="New password"
          type="password"
          required
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </>
  );
}
