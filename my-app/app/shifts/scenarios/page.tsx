import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ShiftScenarioTester } from "@/components/shift-scenario-tester";
import { Button } from "@/components/ui/button";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import { listShiftsAction } from "@/lib/appwrite/phase1-actions";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Shift scenarios",
  description: "Simulate punch-in and punch-out for rotational and overnight shifts.",
  path: "/shifts/scenarios",
});

export default async function ShiftScenariosPage() {
  const ctx = await requireCompanyAdmin();
  const shifts = await listShiftsAction();
  const timeZone = ctx.company.settings.timezone || "Asia/Kolkata";

  return (
    <AdminShell
      title="Shift scenarios"
      subtitle="Test ASHIFT, BSHIFT, 12H, and overnight punch windows"
    >
      <PageHeader
        title="Shift scenario tester"
        description="Simulate punch times against your catalog shifts. Use quick test cases, then verify the same times on mobile with a rostered employee."
        actions={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/shifts" />}
          >
            Back to catalog
          </Button>
        }
      />
      <ShiftScenarioTester shifts={shifts} timeZone={timeZone} />
    </AdminShell>
  );
}
