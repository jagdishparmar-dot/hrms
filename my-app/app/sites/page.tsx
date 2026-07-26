import { AdminShell } from "@/components/admin-shell";
import { SitesDirectory } from "@/components/sites-directory";
import {
  getSitesLivePresenceAction,
  listSitesAction,
} from "@/lib/appwrite/phase1-actions";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Sites",
  description: "Live site map, geofence management, and on-duty workforce tracking.",
  path: "/sites",
});

export default async function SitesPage() {
  const [sites, live] = await Promise.all([
    listSitesAction(),
    getSitesLivePresenceAction(),
  ]);

  return (
    <AdminShell
      title="Sites"
      subtitle="Live map · geofences · on-duty tracking"
    >
      <div className="@container/main flex flex-col gap-5">
        <SitesDirectory sites={sites} initialLive={live} />
      </div>
    </AdminShell>
  );
}
