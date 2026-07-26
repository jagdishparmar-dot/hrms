'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { reviewShiftChangeRequestAction } from '@/lib/appwrite/phase1-actions';
import type { ShiftChangeRequest } from '@/lib/appwrite/types';

export function ShiftChangeReview({ items }: { items: ShiftChangeRequest[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function decide(item: ShiftChangeRequest, decision: 'approved' | 'rejected') {
    const fd = new FormData();
    fd.set('requestId', item.id);
    fd.set('decision', decision);
    startTransition(async () => {
      const result = await reviewShiftChangeRequestAction(fd);
      if (result && 'ok' in result && result.ok === false) {
        toast.error(result.error || 'Unable to review request');
        return;
      }
      toast.success(
        decision === 'approved'
          ? 'Shift change approved — roster updated'
          : 'Shift change rejected',
      );
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} size="sm" className="shadow-xs">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.employeeName || item.employeeId}</p>
                <Badge variant="outline" className="capitalize">
                  {item.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.dateIso}
                {item.sequence > 1 ? ` · slot #${item.sequence}` : ''}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">From </span>
                {item.currentShiftName
                  ? `${item.currentShiftName}${item.currentShiftCode ? ` (${item.currentShiftCode})` : ''}`
                  : 'Default / unassigned'}
                <span className="text-muted-foreground"> → </span>
                {item.requestedShiftName
                  ? `${item.requestedShiftName}${item.requestedShiftCode ? ` (${item.requestedShiftCode})` : ''}`
                  : item.requestedShiftId}
              </p>
              <p className="text-sm">{item.reason}</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => decide(item, 'approved')}
              >
                Approve
              </Button>
              <Button
                type="button"
                disabled={pending}
                variant="outline"
                onClick={() => decide(item, 'rejected')}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}
