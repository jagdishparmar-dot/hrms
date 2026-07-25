"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { CreateEmployeeForm, EditEmployeeForm } from "@/components/employee-forms";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deactivateEmployeeAction,
  deleteEmployeeAction,
} from "@/lib/appwrite/phase1-actions";
import type {
  EmployeeMembership,
  Site,
  ThreePlVendor,
  WorkShift,
} from "@/lib/appwrite/types";
import { cn, getInitials } from "@/lib/utils";

const STATUS_FILTERS = ["All", "active", "inactive", "invited"] as const;
const TYPE_FILTERS = ["All", "Permanent", "3PL", "Intern", "Consultant"] as const;

function statusBadgeClass(status: EmployeeMembership["status"]) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (status === "inactive") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

export function EmployeesDirectory({
  employees,
  sites,
  shifts = [],
  orgConfig,
  vendors,
}: {
  employees: EmployeeMembership[];
  sites: Site[];
  shifts?: WorkShift[];
  orgConfig: { departments: string[]; designations: string[] };
  vendors: ThreePlVendor[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeMembership | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeMembership | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (statusFilter !== "All" && employee.status !== statusFilter) return false;
      if (typeFilter !== "All" && employee.employmentType !== typeFilter) return false;
      if (!q) return true;
      return (
        employee.name.toLowerCase().includes(q) ||
        employee.email.toLowerCase().includes(q) ||
        employee.employeeCode.toLowerCase().includes(q) ||
        employee.department.toLowerCase().includes(q)
      );
    });
  }, [employees, search, statusFilter, typeFilter]);

  function runAction(
    action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    employeeId: string,
    successMessage: string,
  ) {
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      setDeleteEmployee(null);
      router.refresh();
    });
  }

  return (
    <>
      <Card className="shadow-xs">
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Employees</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Hire, update profiles, deactivate, or remove people from this company.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-8 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-8"
                placeholder="Search employees…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add employee
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips
                label="Status"
                value={statusFilter}
                options={STATUS_FILTERS}
                onChange={setStatusFilter}
              />
              <FilterChips
                label="Type"
                value={typeFilter}
                options={TYPE_FILTERS}
                onChange={setTypeFilter}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {employees.length}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg" className="font-medium">
                        <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {employee.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employeeCode || "—"}</TableCell>
                  <TableCell>{employee.employmentType || "—"}</TableCell>
                  <TableCell>{employee.department || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("gap-1.5 capitalize", statusBadgeClass(employee.status))}
                    >
                      <span className="size-1.5 rounded-full bg-current opacity-70" />
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            aria-label={`Open actions for ${employee.name}`}
                            className="size-8 text-muted-foreground"
                            size="icon-sm"
                            variant="ghost"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                          onClick={() => router.push(`/employees/${employee.id}`)}
                        >
                          <UserRound className="size-4" />
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditEmployee(employee)}>
                          Edit employee
                        </DropdownMenuItem>
                        {employee.status !== "inactive" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              runAction(
                                deactivateEmployeeAction,
                                employee.id,
                                `${employee.name} deactivated`,
                              )
                            }
                          >
                            Deactivate
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteEmployee(employee)}
                        >
                          Delete employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-28 text-center text-muted-foreground"
                  >
                    No employees match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>
              Creates an Appwrite user, team membership, and employee profile.
            </DialogDescription>
          </DialogHeader>
          <CreateEmployeeForm
            sites={sites}
            shifts={shifts}
            orgConfig={orgConfig}
            vendors={vendors}
            redirectOnSuccess={false}
            onSuccess={() => {
              setCreateOpen(false);
              toast.success("Employee created");
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editEmployee)}
        onOpenChange={(open) => {
          if (!open) setEditEmployee(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>
              Update profile details for {editEmployee?.name}.
            </DialogDescription>
          </DialogHeader>
          {editEmployee ? (
            <EditEmployeeForm
              key={editEmployee.id}
              employee={editEmployee}
              sites={sites}
              shifts={shifts}
              orgConfig={orgConfig}
              vendors={vendors}
              showExtendedFields={false}
              onSuccess={() => {
                setEditEmployee(null);
                toast.success("Employee updated");
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteEmployee)}
        onOpenChange={(open) => {
          if (!open) setDeleteEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete employee?</DialogTitle>
            <DialogDescription>
              This removes {deleteEmployee?.name} from the company directory and
              team membership. The auth user is deleted only if they have no other
              company memberships.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteEmployee(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !deleteEmployee}
              onClick={() => {
                if (!deleteEmployee) return;
                runAction(
                  deleteEmployeeAction,
                  deleteEmployee.id,
                  `${deleteEmployee.name} deleted`,
                );
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {options.map((option) => (
        <Button
          key={option}
          size="sm"
          variant={value === option ? "secondary" : "ghost"}
          className="h-7 px-2.5"
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
