import { redirect } from 'next/navigation';

import { getCurrentUser, isPlatformAdminEmail } from '@/lib/appwrite/auth';
import { listMembershipsForUser } from '@/lib/appwrite/tenant';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: "Home",
  description: "CheckIn HR employee management portal.",
  path: "/",
});

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (isPlatformAdminEmail(user.email || '')) {
    const memberships = await listMembershipsForUser(user.$id);
    if (memberships.length === 0) redirect('/platform');
  }

  redirect('/dashboard');
}
