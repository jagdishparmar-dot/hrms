'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';

import { ConfirmStatusDialog } from '@/components/platform/confirm-status-dialog';
import {
  PlatformStatusBadge,
  PlatformTableShell,
} from '@/components/platform/platform-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PlatformCompanyRow } from '@/lib/appwrite/types';

export function PlatformCompaniesTable({
  items,
  total,
  page,
  pageSize,
  q,
  status,
}: {
  items: PlatformCompanyRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  status: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pushFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all') params.delete(k);
      else params.set(k, v);
    }
    if (!next.page) params.delete('page');
    startTransition(() => {
      router.push(`/platform/companies?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          className="flex flex-1 flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            pushFilters({ q: query, status, page: '1' });
          }}
        >
          <div className="relative min-w-0 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Search
            </label>
            <Search className="pointer-events-none absolute left-3 top-[calc(50%+10px)] size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, slug, or plan"
              className="pl-9"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-44">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={status || 'all'}
              onValueChange={(v) =>
                pushFilters({ q: query, status: v || 'all', page: '1' })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending} className="sm:self-end">
            Apply
          </Button>
        </form>
        <Button
          render={<Link href="/platform/companies/new" />}
          className="sm:self-end"
        >
          New company
        </Button>
      </div>

      <PlatformTableShell>
        <Table>
          <TableHeader>
            <TableRow className="border-border/80 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Company
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Plan
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                Users
              </TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((company) => (
              <TableRow
                key={company.id}
                className="border-border/60 hover:bg-muted/30"
              >
                <TableCell>
                  <div className="font-semibold text-foreground">
                    <Link
                      href={`/platform/companies/${company.id}`}
                      className="transition-colors hover:text-rose-400"
                    >
                      {company.name}
                    </Link>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {company.slug}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-indigo-300">
                    {company.plan}
                  </span>
                </TableCell>
                <TableCell>
                  <PlatformStatusBadge status={company.status} />
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {company.activeUserCount}
                  <span className="text-muted-foreground">
                    /{company.userCount}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/platform/companies/${company.id}`} />}
                    >
                      Manage
                    </Button>
                    {company.status === 'active' ? (
                      <ConfirmStatusDialog
                        companyId={company.id}
                        slug={company.slug}
                        status="suspended"
                        variant="destructive"
                      />
                    ) : null}
                    {company.status === 'suspended' ||
                    company.status === 'pending' ? (
                      <ConfirmStatusDialog
                        companyId={company.id}
                        slug={company.slug}
                        status="active"
                      />
                    ) : null}
                    {company.status !== 'archived' ? (
                      <ConfirmStatusDialog
                        companyId={company.id}
                        slug={company.slug}
                        status="archived"
                        variant="secondary"
                      />
                    ) : (
                      <ConfirmStatusDialog
                        companyId={company.id}
                        slug={company.slug}
                        status="active"
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No companies match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </PlatformTableShell>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          {total} tenant{total === 1 ? '' : 's'} · page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || pending}
            onClick={() =>
              pushFilters({ q: query, status, page: String(page - 1) })
            }
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || pending}
            onClick={() =>
              pushFilters({ q: query, status, page: String(page + 1) })
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
