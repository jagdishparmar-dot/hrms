"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  KeyRound,
  Lock,
  LockOpen,
  Mail,
  Shield,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { FormError, FormField } from "@/components/form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  resetEmployeePasswordByAdminAction,
  setEmployeeLoginAccessAction,
} from "@/lib/appwrite/phase1-actions";
import type { EmployeeLoginInfo, TenantRole } from "@/lib/appwrite/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<TenantRole, string> = {
  company_admin: "Company admin",
  hr_manager: "HR manager",
  payroll_admin: "Payroll admin",
  reporting_manager: "Reporting manager",
  employee: "Employee",
  vendor_admin: "Vendor admin",
};

function formatLoginTimestamp(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-sm font-medium", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

export function EmployeeLoginPanel({
  employeeId,
  employeeName,
  loginInfo,
}: {
  employeeId: string;
  employeeName: string;
  loginInfo: EmployeeLoginInfo;
}) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const willBlock = loginInfo.loginAllowed;

  function refreshAfterSuccess(message: string) {
    toast.success(message);
    setResetOpen(false);
    setAccessOpen(false);
    setError(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="shadow-xs lg:col-span-3">
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <UserCircle2 className="size-4" />
            </div>
            <div>
              <CardTitle>Login account</CardTitle>
              <CardDescription>
                Appwrite auth identity linked to this employee profile.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("gap-1.5 capitalize", statusTone(loginInfo.loginAllowed))}
            >
              {loginInfo.loginAllowed ? (
                <LockOpen className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              {loginInfo.loginAllowed ? "Login allowed" : "Login blocked"}
            </Badge>
            {loginInfo.mustChangePassword ? (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Must change password
              </Badge>
            ) : null}
            {loginInfo.emailVerified ? (
              <Badge variant="outline">Email verified</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Email not verified
              </Badge>
            )}
          </div>

          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
            <InfoRow
              label="Login email"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {loginInfo.email}
                </span>
              }
            />
            <InfoRow
              label="Portal role"
              value={
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <Shield className="size-3.5 text-muted-foreground" />
                  {ROLE_LABELS[loginInfo.role] || loginInfo.role.replaceAll("_", " ")}
                </span>
              }
            />
            <InfoRow
              label="Employee status"
              value={<span className="capitalize">{loginInfo.employeeStatus}</span>}
            />
            <InfoRow
              label="Auth account"
              value={loginInfo.authUserActive ? "Active" : "Blocked"}
            />
            <InfoRow
              label="User ID"
              value={loginInfo.userId}
              mono
            />
            <InfoRow
              label="Registered"
              value={formatLoginTimestamp(loginInfo.registeredAt)}
            />
            <InfoRow
              label="Last access"
              value={formatLoginTimestamp(loginInfo.lastAccessAt)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs lg:col-span-2">
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <KeyRound className="size-4" />
            </div>
            <div>
              <CardTitle>Access controls</CardTitle>
              <CardDescription>
                Reset credentials or block sign-in for {employeeName.split(" ")[0]}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          <Alert>
            <AlertDescription className="text-xs leading-relaxed">
              Password resets set a temporary password and require the employee to
              change it on next login. Blocking disables both the HR profile status
              and the underlying auth account.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="justify-start"
            onClick={() => {
              setError(null);
              setResetOpen(true);
            }}
          >
            <KeyRound className="size-4" />
            Reset password
          </Button>

          <Button
            variant={willBlock ? "destructive" : "secondary"}
            className="justify-start"
            onClick={() => {
              setError(null);
              setAccessOpen(true);
            }}
          >
            {willBlock ? (
              <>
                <Lock className="size-4" />
                Block login
              </>
            ) : (
              <>
                <LockOpen className="size-4" />
                Unblock login
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for {employeeName}. They will be prompted
              to change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              fd.set("employeeId", employeeId);
              setError(null);
              startTransition(async () => {
                const result = await resetEmployeePasswordByAdminAction(fd);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                refreshAfterSuccess("Password reset. Share the new password securely.");
              });
            }}
          >
            <FormField
              name="newPassword"
              label="New temporary password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
            <FormField
              name="confirmPassword"
              label="Confirm password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
            <FormError message={error} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {willBlock ? "Block login?" : "Unblock login?"}
            </DialogTitle>
            <DialogDescription>
              {willBlock
                ? `${employeeName} will not be able to sign in to the portal or mobile app until you unblock them.`
                : `${employeeName} will be marked active and their auth account will be re-enabled.`}
            </DialogDescription>
          </DialogHeader>
          <FormError message={error} />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setAccessOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={willBlock ? "destructive" : "default"}
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("employeeId", employeeId);
                fd.set("blocked", willBlock ? "true" : "false");
                setError(null);
                startTransition(async () => {
                  const result = await setEmployeeLoginAccessAction(fd);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  refreshAfterSuccess(
                    willBlock ? "Login blocked." : "Login unblocked.",
                  );
                });
              }}
            >
              {pending
                ? "Saving…"
                : willBlock
                  ? "Block login"
                  : "Unblock login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
