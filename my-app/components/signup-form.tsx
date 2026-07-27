'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FormError, FormField } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { signupAction } from '@/lib/appwrite/actions';

export function SignupForm() {
  const router = useRouter();
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
            const result = await signupAction(fd);
            if (result && !result.ok) {
              setError(result.error);
              return;
            }
            router.replace('/dashboard');
            router.refresh();
          } catch {
            /* NEXT_REDIRECT */
          }
        });
      }}
    >
      <FormField
        name="companyName"
        label="Company name"
        required
        minLength={2}
        placeholder="Acme Logistics"
      />
      <FormField name="name" label="Your name" required minLength={2} placeholder="Priya Sharma" />
      <FormField
        name="email"
        label="Work email"
        type="email"
        required
        autoComplete="email"
        placeholder="admin@acme.com"
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Min. 8 characters"
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating company…' : 'Create company'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
