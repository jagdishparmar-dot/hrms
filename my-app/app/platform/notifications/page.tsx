import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformSection } from '@/components/platform/platform-section';
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
    <AdminShell
      mode="platform"
      title="Notifications"
      subtitle="Communication"
    >
      <PageHeader
        title="Notifications & communication"
        description="Operational messaging channels for platform and tenant events."
      />
      <PlatformSection
        title="Current channels"
        description="Email sender identity is tenant-configurable today."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Tenant <span className="text-foreground">emailSenderName</span> on
            company branding.
          </li>
          <li>
            Lifecycle actions (suspend/archive) are audited; outbound email/SMS
            providers can subscribe to those audit actions.
          </li>
          <li>
            Recommended next step: Appwrite Function or queue worker for
            provisioned / suspended tenant notifications.
          </li>
        </ul>
      </PlatformSection>
    </AdminShell>
  );
}
