'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FormSelect } from '@/components/form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  deleteEmployeeDocumentAction,
  uploadEmployeeDocumentAction,
} from '@/lib/appwrite/phase1-actions';
import type { EmployeeDocument } from '@/lib/appwrite/types';

const CATEGORY_LABELS: Record<string, string> = {
  profile_picture: 'Profile picture',
  identity: 'Identity',
  compliance: 'Compliance',
  employment: 'Employment',
};

export function EmployeeDocumentsPanel({
  employeeId,
  documents,
}: {
  employeeId: string;
  documents: EmployeeDocument[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Profile pictures, identity, compliance, and employment attachments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('employeeId', employeeId);
            setError(null);
            startTransition(async () => {
              const result = await uploadEmployeeDocumentAction(fd);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              (e.target as HTMLFormElement).reset();
              router.refresh();
            });
          }}>
          <FormSelect
            name="category"
            label="Category"
            required
            defaultValue="profile_picture"
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Title</span>
            <input
              name="title"
              required
              placeholder="PAN card scan"
              className="h-9 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">File (JPG, PNG, WEBP, PDF — max 10 MB)</span>
            <input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.pdf" />
          </label>
          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{doc.title}</td>
                  <td className="px-3 py-2">{CATEGORY_LABELS[doc.category] || doc.category}</td>
                  <td className="px-3 py-2">{doc.fileName}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const fd = new FormData();
                          fd.set('employeeId', employeeId);
                          fd.set('documentId', doc.id);
                          await deleteEmployeeDocumentAction(fd);
                          router.refresh();
                        });
                      }}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
