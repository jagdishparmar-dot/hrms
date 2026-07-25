import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Fields employees may update on their own profile (mobile self-service). */
export const employeeSelfUpdateSchema = z.object({
  phone: optionalText(20),
  currentAddressLine1: optionalText(256),
  currentAddressLine2: optionalText(256),
  currentCity: optionalText(128),
  currentState: optionalText(128),
  currentPincode: optionalText(12),
  emergencyContactName: optionalText(128),
  emergencyContactPhone: optionalText(20),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || panRegex.test(v), 'Invalid PAN format.'),
  aadhaarNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^\d{12}$/.test(v.replace(/\s/g, '')), 'Aadhaar must be 12 digits.'),
  uanNumber: optionalText(12),
  esiNumber: optionalText(17),
  pfAccountNumber: optionalText(32),
  bankName: optionalText(128),
  bankIfsc: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || ifscRegex.test(v), 'Invalid IFSC format.'),
  bankAccountNumber: optionalText(32),
});

export const employeeDocumentCategorySchema = z.enum([
  'profile_picture',
  'identity',
  'compliance',
  'employment',
]);

export const employeeDocumentUploadSchema = z.object({
  category: employeeDocumentCategorySchema,
  title: z.string().trim().min(1).max(256),
});

/** Mobile uploads send base64 JSON because RN FormData parts are not web File blobs. */
export const employeeDocumentMobileUploadSchema = employeeDocumentUploadSchema.extend({
  fileName: z.string().trim().min(1).max(256),
  mimeType: z.string().trim().min(1).max(128),
  dataBase64: z.string().min(1),
});

export const employeeDocumentDeleteSchema = z.object({
  documentId: z.string().min(1),
});

export const EMPLOYEE_SELF_EDITABLE_KEYS = [
  'phone',
  'currentAddressLine1',
  'currentAddressLine2',
  'currentCity',
  'currentState',
  'currentPincode',
  'emergencyContactName',
  'emergencyContactPhone',
  'panNumber',
  'aadhaarNumber',
  'uanNumber',
  'esiNumber',
  'pfAccountNumber',
  'bankName',
  'bankIfsc',
  'bankAccountNumber',
] as const;

export type EmployeeSelfUpdateInput = z.infer<typeof employeeSelfUpdateSchema>;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
