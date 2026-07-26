import { HelpHubContent } from "@/components/help/help-hub-content";
import { HelpLayout } from "@/components/help/help-layout";
import { HelpSidebarNav } from "@/components/help/help-sidebar-nav";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Help & Support",
  description: "Documentation and guides for every module in the HR portal.",
  path: "/help",
});

export default async function HelpPage() {
  await requireCompanyAdmin();

  return (
    <AdminShell
      title="Help & Support"
      subtitle="Guides, workflows, and best practices for every module"
    >
      <PageHeader
        title="Help & Support"
        description="Search or browse module guides. Start with Getting started if you are setting up a new tenant."
      />
      <HelpLayout sidebar={<HelpSidebarNav />}>
        <HelpHubContent />
      </HelpLayout>
    </AdminShell>
  );
}
