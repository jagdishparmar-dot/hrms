import { Bell } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformInfoList,
  PlatformPageBanner,
  PlatformSection,
} from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Notifications',
  description: 'Platform notification channels and delivery settings.',
  path: '/platform/notifications',
});

export default async function PlatformNotificationsPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="Notifications" subtitle="Communication">
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Messaging"
          title="Notifications & communication"
          description="Operational messaging channels for platform and tenant events."
          icon={Bell}
        />
        <PlatformSection
          title="Current channels"
          description="Email sender identity is tenant-configurable today."
          icon={Bell}
        >
          <PlatformInfoList
            items={[
              <>
                Tenant{' '}
                <span className="font-mono text-rose-300">emailSenderName</span>{' '}
                on company branding.
              </>,
              'Lifecycle actions (suspend/archive) are audited; outbound email/SMS providers can subscribe to those audit actions.',
              'Recommended next step: Appwrite Function or queue worker for provisioned / suspended tenant notifications.',
            ]}
          />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
