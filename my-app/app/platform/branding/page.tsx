import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformSection } from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';

export default async function PlatformBrandingPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="Branding" subtitle="Customization">
      <PageHeader
        title="Branding & customization"
        description="Platform-level brand defaults and per-tenant overrides."
      />
      <PlatformSection
        title="Tenant branding"
        description="Logo URL, primary color, and email sender name are stored on each company document and editable from the company detail page."
      >
        <p className="text-sm text-muted-foreground">
          Open a company under Companies → Configuration to set logo, colors, and
          sender name. Self-serve tenant admins can also adjust branding in
          Settings when their role allows.
        </p>
      </PlatformSection>
      <PlatformSection
        title="Platform shell"
        description="Console chrome uses the shared HR Portal design system."
      >
        <p className="text-sm text-muted-foreground">
          Global white-label themes for the platform console can be layered later
          via env-driven CSS variables without changing tenant data boundaries.
        </p>
      </PlatformSection>
    </AdminShell>
  );
}
