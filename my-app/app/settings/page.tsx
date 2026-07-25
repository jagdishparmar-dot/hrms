import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import { listThreePlVendorsAction } from "@/lib/appwrite/phase1-actions";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Settings",
  description: "Company organization settings, departments, employee codes, and 3PL vendors.",
  path: "/settings",
});

export default async function SettingsPage() {
  const ctx = await requireCompanyAdmin();
  const vendors = await listThreePlVendorsAction();

  return (
    <AdminShell
      title="Company settings"
      subtitle="Organization structure, 3PL providers, timezone, and branding"
    >
      <PageHeader
        title="Settings"
        description="General, organization, 3PL providers, and branding — organized by tab."
      />
      <SettingsForm company={ctx.company} vendors={vendors} />
    </AdminShell>
  );
}
