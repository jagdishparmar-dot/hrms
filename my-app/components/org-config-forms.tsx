'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FormError, FormField, FormSuccess } from '@/components/form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deactivateThreePlVendorAction,
  upsertThreePlVendorAction,
} from '@/lib/appwrite/phase1-actions';
import type { ThreePlVendor } from '@/lib/appwrite/types';

export function ConfigListField({
  name,
  label,
  description,
  defaultItems,
  placeholder = 'Add item…',
}: {
  name: string;
  label: string;
  description?: string;
  defaultItems: string[];
  placeholder?: string;
}) {
  const [items, setItems] = useState(defaultItems);
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value || items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      return;
    }
    setItems((current) => [...current, value]);
    setDraft('');
  };

  return (
    <div className="grid gap-2 sm:col-span-2">
      <Label htmlFor={`${name}-draft`}>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <input type="hidden" name={name} value={items.join(',')} />
      <div className="flex gap-2">
        <Input
          id={`${name}-draft`}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addItem}>
          Add
        </Button>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {item}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Remove ${item}`}
                  onClick={() => setItems((current) => current.filter((entry) => entry !== item))}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No items configured yet.</p>
      )}
    </div>
  );
}

export function ThreePlVendorManager({ vendors }: { vendors: ThreePlVendor[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeVendors = vendors.filter((vendor) => vendor.status === 'active');

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>3PL manpower providers</CardTitle>
        <CardDescription>
          Register third-party staffing vendors. Employees with employment type 3PL must be linked to
          one of these providers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fd = new FormData(form);
            setError(null);
            setOk(null);
            startTransition(async () => {
              const result = await upsertThreePlVendorAction(fd);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOk('3PL provider saved.');
              form.reset();
              router.refresh();
            });
          }}
        >
          <FormField name="name" label="Vendor name" placeholder="Acme Staffing" required />
          <FormField name="contactName" label="Contact person" placeholder="Jane Doe" />
          <FormField
            name="contactEmail"
            label="Contact email"
            type="email"
            placeholder="vendor@example.com"
          />
          <FormField
            name="contactPhone"
            label="Contact phone"
            placeholder="+91 98765 43210"
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Add provider'}
            </Button>
          </div>
        </form>

        {activeVendors.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {activeVendors.map((vendor) => (
              <li
                key={vendor.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{vendor.name}</p>
                  <p className="text-muted-foreground">
                    {[vendor.contactName, vendor.contactEmail, vendor.contactPhone]
                      .filter(Boolean)
                      .join(' · ') || 'No contact details'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setOk(null);
                    const fd = new FormData();
                    fd.set('vendorId', vendor.id);
                    startTransition(async () => {
                      const result = await deactivateThreePlVendorAction(fd);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setOk(`${vendor.name} deactivated.`);
                      router.refresh();
                    });
                  }}
                >
                  Deactivate
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active 3PL providers yet. Add one above before assigning 3PL employees.
          </p>
        )}

        <FormError message={error} />
        <FormSuccess message={ok} />
      </CardContent>
    </Card>
  );
}
