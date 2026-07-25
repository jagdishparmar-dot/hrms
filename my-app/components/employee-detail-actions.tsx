"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deactivateEmployeeAction,
  deleteEmployeeAction,
} from "@/lib/appwrite/phase1-actions";
import type { EmployeeMembership } from "@/lib/appwrite/types";

export function EmployeeDetailActions({
  employee,
}: {
  employee: EmployeeMembership;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(
    action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string,
    redirectAfter = false,
  ) {
    const fd = new FormData();
    fd.set("employeeId", employee.id);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      setDeleteOpen(false);
      if (redirectAfter) {
        router.push("/employees");
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {employee.status !== "inactive" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(deactivateEmployeeAction, `${employee.name} deactivated`)
            }
          >
            Deactivate
          </Button>
        ) : null}
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete employee?</DialogTitle>
            <DialogDescription>
              Remove {employee.name} from this company. Related team membership is
              cleared; the auth account is deleted only if unused elsewhere.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(deleteEmployeeAction, `${employee.name} deleted`, true)
              }
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
