import Link from "next/link";
import { notFound } from "next/navigation";

import { HelpLayout } from "@/components/help/help-layout";
import { HelpModuleView } from "@/components/help/help-module-view";
import { HelpSidebarNav } from "@/components/help/help-sidebar-nav";
import { AdminShell } from "@/components/admin-shell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import { getHelpModule, getHelpModuleSlugs } from "@/lib/help/tenant-modules";
import { pageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getHelpModuleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const module = getHelpModule(slug);
  if (!module) return pageMetadata({ title: "Help", path: "/help" });

  return pageMetadata({
    title: `${module.title} — Help`,
    description: module.summary,
    path: `/help/${slug}`,
  });
}

export default async function HelpModulePage({ params }: PageProps) {
  await requireCompanyAdmin();
  const { slug } = await params;
  const module = getHelpModule(slug);
  if (!module) notFound();

  return (
    <AdminShell
      title={module.title}
      subtitle="Help & Support"
    >
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/help" />}>Help</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{module.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <HelpLayout
        sidebar={<HelpSidebarNav currentSlug={slug} currentModule={module} />}
      >
        <HelpModuleView module={module} />
      </HelpLayout>
    </AdminShell>
  );
}
