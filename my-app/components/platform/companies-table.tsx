'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmStatusDialog } from '@/components/platform/confirm-status-dialog';
import { Badge } from '@/components/ui/badge';
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

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  suspended: 'destructive',
  pending: 'secondary',
  archived: 'outline',
};

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
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Search
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, slug, or plan"
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
        <Button render={<Link href="/platform/companies/new" />} className="sm:self-end">
          New company
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="font-medium">
                    <Link
                      href={`/platform/companies/${company.id}`}
                      className="hover:underline"
                    >
                      {company.name}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.slug}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{company.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[company.status] || 'outline'}>
                    {company.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
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
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} tenant{total === 1 ? '' : 's'} · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || pending}
            onClick={() =>
              pushFilters({ q: query, status, page: String(page - 1) })
            }
          >
            Previous
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
