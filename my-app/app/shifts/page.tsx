import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ShiftsDirectory } from "@/components/shifts-directory";
import { Button } from "@/components/ui/button";
import { listShiftsAction } from "@/lib/appwrite/phase1-actions";

export default async function ShiftsPage() {
  const shifts = await listShiftsAction();

  return (
    <AdminShell
      title="Shifts"
      subtitle="Day, evening, night, and cross-midnight attendance windows"
    >
      <PageHeader
        title="Shifts"
        description="Attendance is keyed to the shift business date. Overnight punch-out stays on the original shift record."
        actions={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/shifts/roster" />}
          >
            Open roster
          </Button>
        }
      />
      <ShiftsDirectory shifts={shifts} />
    </AdminShell>
  );
}
