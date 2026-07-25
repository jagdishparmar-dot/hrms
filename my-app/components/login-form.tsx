'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FormError, FormField } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { loginAction } from '@/lib/appwrite/actions';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          try {
            const result = await loginAction(fd);
            if (result && !result.ok) {
              setError(result.error);
              return;
            }
            router.replace(next.startsWith('/') ? next : '/dashboard');
            router.refresh();
          } catch {
            /* NEXT_REDIRECT */
          }
        });
      }}
    >
      <input
        type="hidden"
        name="next"
        value={next.startsWith('/') ? next : '/dashboard'}
      />
      <FormField
        name="email"
        label="Work email"
        type="email"
        required
        autoComplete="email"
        placeholder="hr@company.com"
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
