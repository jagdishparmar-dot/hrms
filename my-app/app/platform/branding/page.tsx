import { Palette } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformInfoList,
  PlatformPageBanner,
  PlatformSection,
} from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Branding',
  description: 'Default platform branding and white-label settings.',
  path: '/platform/branding',
});

export default async function PlatformBrandingPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="Branding" subtitle="Customization">
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="White-label"
          title="Branding & customization"
          description="Platform-level brand defaults and per-tenant overrides for logos, colors, and sender identity."
          icon={Palette}
        />
        <PlatformSection
          title="Tenant branding"
          description="Logo URL, primary color, and email sender name are stored on each company document and editable from the company detail page."
          icon={Palette}
        >
          <PlatformInfoList
            items={[
              'Open a company under Companies → Configuration to set logo, colors, and sender name.',
              'Self-serve tenant admins can also adjust branding in Settings when their role allows.',
              'Primary color feeds tenant theming; logo URL is used in emails and mobile shell headers.',
            ]}
          />
        </PlatformSection>
        <PlatformSection
          title="Platform shell"
          description="Console chrome uses the shared Design System slate + rose reference."
          icon={Palette}
        >
          <PlatformInfoList
            items={[
              'Platform console uses Slate 950 canvas with Rose 600 primary actions.',
              'Tenant HR portal uses Indigo 600 as the HR accent within the same design system.',
              'Global white-label themes can be layered via env-driven CSS variables without changing tenant data boundaries.',
            ]}
          />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
