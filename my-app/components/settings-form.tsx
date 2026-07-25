'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  FormCheckbox,
  FormError,
  FormField,
  FormSuccess,
} from '@/components/form-fields';
import { ConfigListField, ThreePlVendorManager } from '@/components/org-config-forms';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateTenantSettingsAction } from '@/lib/appwrite/actions';
import type { Company, ThreePlVendor } from '@/lib/appwrite/types';
import { previewNextEmployeeCode } from '@/lib/employee-code';

function SettingsHiddenFields({
  company,
  omit,
}: {
  company: Company;
  omit: 'general' | 'organization' | 'branding';
}) {
  return (
    <>
      {omit !== 'general' ? (
        <>
          <input type="hidden" name="timezone" value={company.settings.timezone} />
          <input type="hidden" name="currency" value={company.settings.currency} />
          <input type="hidden" name="workWeek" value={company.settings.workWeek.join(',')} />
          <input
            type="hidden"
            name="jurisdictions"
            value={company.settings.jurisdictions.join(',')}
          />
        </>
      ) : null}
      {omit !== 'organization' ? (
        <>
          <input type="hidden" name="departments" value={company.settings.departments.join(',')} />
          <input type="hidden" name="designations" value={company.settings.designations.join(',')} />
          <input
            type="hidden"
            name="employeeCodePrefix"
            value={company.settings.employeeCodePrefix ?? 'EMP'}
          />
          <input
            type="hidden"
            name="employeeCodePadding"
            value={String(company.settings.employeeCodePadding ?? 4)}
          />
          <input
            type="hidden"
            name="employeeCodeNextSequence"
            value={String(company.settings.employeeCodeNextSequence ?? 1)}
          />
          <input
            type="hidden"
            name="employeeCodeAutoGenerate"
            value={company.settings.employeeCodeAutoGenerate !== false ? 'on' : ''}
          />
        </>
      ) : null}
      {omit !== 'branding' ? (
        <>
          <input type="hidden" name="primaryColor" value={company.branding.primaryColor} />
          <input type="hidden" name="emailSenderName" value={company.branding.emailSenderName} />
          <input type="hidden" name="logoUrl" value={company.branding.logoUrl} />
        </>
      ) : null}
    </>
  );
}

function SettingsSaveFooter({
  pending,
  error,
  ok,
}: {
  pending: boolean;
  error: string | null;
  ok: boolean;
}) {
  return (
    <CardFooter className="flex flex-col items-stretch gap-3 border-t px-6 [.border-t]:pt-6">
      <FormError message={error} />
      <FormSuccess message={ok ? 'Settings saved.' : null} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </CardFooter>
  );
}

type TabId = 'general' | 'organization' | 'branding';

export function SettingsForm({
  company,
  vendors,
}: {
  company: Company;
  vendors: ThreePlVendor[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId | 'vendors'>('general');
  const [feedback, setFeedback] = useState<
    Partial<Record<TabId, { error: string | null; ok: boolean }>>
  >({});
  const [formRevision, setFormRevision] = useState(0);
  const [pending, startTransition] = useTransition();

  function saveSettings(tab: TabId, fd: FormData) {
    setFeedback((current) => ({ ...current, [tab]: { error: null, ok: false } }));
    startTransition(async () => {
      const result = await updateTenantSettingsAction(fd);
      if (!result.ok) {
        setFeedback((current) => ({ ...current, [tab]: { error: result.error, ok: false } }));
        return;
      }
      setFeedback((current) => ({ ...current, [tab]: { error: null, ok: true } }));
      setFormRevision((revision) => revision + 1);
      router.refresh();
    });
  }

  const activeVendorCount = vendors.filter((vendor) => vendor.status === 'active').length;
  const settingsVersion = `${company.$updatedAt ?? company.id}-${formRevision}`;
  const nextEmployeeCodePreview = previewNextEmployeeCode(company.settings);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabId | 'vendors')}
      className="flex max-w-3xl flex-col gap-4"
    >
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="vendors">
          3PL providers{activeVendorCount ? ` (${activeVendorCount})` : ''}
        </TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="flex flex-col gap-4">
        <form
          key={`settings-general-${settingsVersion}`}
          onSubmit={(event) => {
            event.preventDefault();
            saveSettings('general', new FormData(event.currentTarget));
          }}
        >
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Timezone, currency, work week, and jurisdictions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SettingsHiddenFields company={company} omit="general" />
              <FormField
                label="Timezone"
                name="timezone"
                defaultValue={company.settings.timezone}
              />
              <FormField
                label="Currency"
                name="currency"
                defaultValue={company.settings.currency}
              />
              <FormField
                label="Work week (comma-separated)"
                name="workWeek"
                className="sm:col-span-2"
                defaultValue={company.settings.workWeek.join(',')}
              />
              <FormField
                label="Jurisdictions (comma-separated)"
                name="jurisdictions"
                className="sm:col-span-2"
                defaultValue={company.settings.jurisdictions.join(',')}
              />
            </CardContent>
            <SettingsSaveFooter
              pending={pending}
              error={feedback.general?.error ?? null}
              ok={feedback.general?.ok ?? false}
            />
          </Card>
        </form>
      </TabsContent>

      <TabsContent value="organization" className="flex flex-col gap-4">
        <form
          key={`settings-organization-${settingsVersion}`}
          onSubmit={(event) => {
            event.preventDefault();
            saveSettings('organization', new FormData(event.currentTarget));
          }}
        >
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Organization structure</CardTitle>
              <CardDescription>
                Departments and designations used when creating or editing employees.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SettingsHiddenFields company={company} omit="organization" />
              <ConfigListField
                name="departments"
                label="Departments"
                description="Examples: Engineering, Operations, HR"
                defaultItems={company.settings.departments}
                placeholder="Add department"
              />
              <ConfigListField
                name="designations"
                label="Designations"
                description="Examples: Software Engineer, Team Lead, Executive"
                defaultItems={company.settings.designations}
                placeholder="Add designation"
              />
              <div className="sm:col-span-2 space-y-4 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">Employee code generation</p>
                  <p className="text-xs text-muted-foreground">
                    Used when adding employees. Next code preview:{' '}
                    <span className="font-mono text-foreground">{nextEmployeeCodePreview}</span>
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    name="employeeCodePrefix"
                    label="Code prefix"
                    defaultValue={company.settings.employeeCodePrefix ?? 'EMP'}
                    placeholder="EMP"
                    maxLength={16}
                  />
                  <FormField
                    name="employeeCodePadding"
                    label="Sequence digits"
                    type="number"
                    min={1}
                    max={8}
                    defaultValue={String(company.settings.employeeCodePadding ?? 4)}
                  />
                  <FormField
                    name="employeeCodeNextSequence"
                    label="Next sequence number"
                    type="number"
                    min={1}
                    defaultValue={String(company.settings.employeeCodeNextSequence ?? 1)}
                  />
                  <div className="flex items-end pb-1">
                    <FormCheckbox
                      name="employeeCodeAutoGenerate"
                      label="Auto-generate code on employee create"
                      defaultChecked={company.settings.employeeCodeAutoGenerate !== false}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <SettingsSaveFooter
              pending={pending}
              error={feedback.organization?.error ?? null}
              ok={feedback.organization?.ok ?? false}
            />
          </Card>
        </form>
      </TabsContent>

      <TabsContent value="vendors" className="flex flex-col gap-4">
        <ThreePlVendorManager key={`settings-vendors-${settingsVersion}`} vendors={vendors} />
      </TabsContent>

      <TabsContent value="branding" className="flex flex-col gap-4">
        <form
          key={`settings-branding-${settingsVersion}`}
          onSubmit={(event) => {
            event.preventDefault();
            saveSettings('branding', new FormData(event.currentTarget));
          }}
        >
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Colors and email sender identity</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SettingsHiddenFields company={company} omit="branding" />
              <FormField
                label="Primary color"
                name="primaryColor"
                defaultValue={company.branding.primaryColor}
              />
              <FormField
                label="Email sender name"
                name="emailSenderName"
                defaultValue={company.branding.emailSenderName}
              />
              <FormField
                label="Logo URL"
                name="logoUrl"
                className="sm:col-span-2"
                defaultValue={company.branding.logoUrl}
              />
            </CardContent>
            <SettingsSaveFooter
              pending={pending}
              error={feedback.branding?.error ?? null}
              ok={feedback.branding?.ok ?? false}
            />
          </Card>
        </form>
      </TabsContent>
    </Tabs>
  );
}
