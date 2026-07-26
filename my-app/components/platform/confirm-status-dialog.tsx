'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { FormError, FormField } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { changePlatformCompanyStatusAction } from '@/lib/appwrite/platform-actions';
import type { CompanyStatus } from '@/lib/appwrite/types';

const LABELS: Record<CompanyStatus, string> = {
  active: 'Activate',
  suspended: 'Suspend',
  pending: 'Mark pending',
  archived: 'Archive',
};

export function ConfirmStatusDialog({
  companyId,
  slug,
  status,
  variant = 'outline',
  disabled,
}: {
  companyId: string;
  slug: string;
  status: CompanyStatus;
  variant?: 'outline' | 'destructive' | 'default' | 'secondary';
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const phrase =
    status === 'archived'
      ? `ARCHIVE ${slug}`
      : status === 'suspended'
        ? `SUSPEND ${slug}`
        : `ACTIVATE ${slug}`;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {LABELS[status]}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{LABELS[status]} tenant</DialogTitle>
            <DialogDescription>
              This is a sensitive lifecycle change. Type{' '}
              <span className="font-mono text-foreground">{phrase}</span> to
              confirm. Tenant users lose access when suspended or archived.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set('companyId', companyId);
              fd.set('status', status);
              setError(null);
              startTransition(async () => {
                const result = await changePlatformCompanyStatusAction(fd);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            <FormField
              name="confirmPhrase"
              label="Confirmation phrase"
              required
              autoComplete="off"
              placeholder={phrase}
            />
            <FormError message={error} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={status === 'active' ? 'default' : 'destructive'}
                disabled={pending}
              >
                {pending ? 'Applying…' : LABELS[status]}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
