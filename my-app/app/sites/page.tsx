import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { SitesDirectory } from "@/components/sites-directory";
import { listSitesAction } from "@/lib/appwrite/phase1-actions";

export default async function SitesPage() {
  const sites = await listSitesAction();

  return (
    <AdminShell title="Sites" subtitle="Geofence locations for mobile punch">
      <PageHeader
        title="Sites"
        description="Define office geofences, radii, and availability for mobile check-in."
      />
      <SitesDirectory sites={sites} />
    </AdminShell>
  );
}
