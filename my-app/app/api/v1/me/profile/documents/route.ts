import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  EMPLOYEE_UPLOAD_CATEGORIES,
  getEmployeeProfileSnapshot,
  listEmployeeDocuments,
  uploadEmployeeDocument,
} from '@/lib/appwrite/employee-profile';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';
import {
  employeeDocumentMobileUploadSchema,
  employeeDocumentUploadSchema,
} from '@/lib/schemas/employee-profile';

async function parseUploadRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    const parsed = employeeDocumentMobileUploadSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid payload' };
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(parsed.data.dataBase64, 'base64');
    } catch {
      return { ok: false as const, error: 'Invalid file encoding.' };
    }
    if (buffer.byteLength === 0) {
      return { ok: false as const, error: 'File is required.' };
    }
    return {
      ok: true as const,
      category: parsed.data.category,
      title: parsed.data.title,
      fileName: parsed.data.fileName,
      mimeType:
        parsed.data.mimeType === 'image/jpg' ? 'image/jpeg' : parsed.data.mimeType,
      buffer,
    };
  }

  const form = await request.formData();
  const parsed = employeeDocumentUploadSchema.safeParse({
    category: form.get('category'),
    title: form.get('title'),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid payload' };
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: 'File is required.' };
  }

  return {
    ok: true as const,
    category: parsed.data.category,
    title: parsed.data.title,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveMobileContext(request);
    if (!ctx.ok) {
      return withMobileCors(
        NextResponse.json({ error: ctx.error }, { status: ctx.status }),
      );
    }

    const documents = await listEmployeeDocuments(ctx.membership.companyId, ctx.membership.id);
    return withMobileCors(NextResponse.json({ ok: true, documents }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load documents';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveMobileContext(request);
    if (!ctx.ok) {
      return withMobileCors(
        NextResponse.json({ error: ctx.error }, { status: ctx.status }),
      );
    }

    const upload = await parseUploadRequest(request);
    if (!upload.ok) {
      return withMobileCors(NextResponse.json({ error: upload.error }, { status: 400 }));
    }

    const result = await uploadEmployeeDocument({
      membership: ctx.membership,
      company: ctx.company,
      uploadedByUserId: ctx.user.$id,
      category: upload.category,
      title: upload.title,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      buffer: upload.buffer,
      allowEmployeeCategories: EMPLOYEE_UPLOAD_CATEGORIES,
    });

    if (!result.ok) {
      return withMobileCors(NextResponse.json({ error: result.error }, { status: 400 }));
    }

    const snapshot = await getEmployeeProfileSnapshot({
      membership: ctx.membership,
      company: ctx.company,
    });

    return withMobileCors(
      NextResponse.json({ ok: true, document: result.document, ...snapshot }),
    );
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to upload document';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
