import { redirect } from 'next/navigation';

import { ChangePasswordForm } from '@/components/change-password-form';
import { AuthShell } from '@/components/auth-shell';
import { requirePasswordChangeContext } from '@/lib/appwrite/phase1-actions';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Change password',
  description: 'Set a new password to continue using CheckIn HR.',
  path: '/change-password',
});

export default async function ChangePasswordPage() {
  await requirePasswordChangeContext();

  return (
    <AuthShell>
      <ChangePasswordForm />
    </AuthShell>
  );
}
