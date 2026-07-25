import { z } from 'zod';

import { slugSchema } from '@/lib/schemas/phase0';

export const companyStatusSchema = z.enum([
  'active',
  'suspended',
  'pending',
  'archived',
]);

export const platformListCompaniesSchema = z.object({
  q: z.string().trim().max(128).optional().default(''),
  status: z
    .enum(['all', 'active', 'suspended', 'pending', 'archived'])
    .optional()
    .default('all'),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export const platformUpdateCompanySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(2).max(128),
  plan: z.string().trim().min(1).max(32),
  maxEmployees: z.coerce.number().int().min(1).max(100000),
  status: companyStatusSchema,
  payroll3pl: z.coerce.boolean().optional(),
  geofencing: z.coerce.boolean().optional(),
  selfiePunch: z.coerce.boolean().optional(),
  sso: z.coerce.boolean().optional(),
  /** Required when moving to suspended / archived */
  confirmPhrase: z.string().trim().optional().default(''),
});

export const platformUpdateCompanyConfigSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(2).max(128),
  legalName: z.string().trim().max(256).optional().or(z.literal('')),
  gstin: z.string().trim().max(32).optional().or(z.literal('')),
  registeredAddress: z.string().trim().max(512).optional().or(z.literal('')),
  contactEmail: z.union([z.literal(''), z.string().trim().email()]).optional(),
  contactPhone: z.string().trim().max(32).optional().or(z.literal('')),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().trim().min(1).max(8),
  workWeek: z.string().trim().min(1).max(128),
  jurisdictions: z.string().trim().min(1).max(256),
  lateGraceMinutes: z.coerce.number().int().min(0).max(240).optional(),
  payCycleDay: z.coerce.number().int().min(1).max(28).optional(),
  dataRetentionDays: z.coerce.number().int().min(30).max(3650).optional(),
  logoUrl: z.string().trim().max(512).optional().or(z.literal('')),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Use hex color like #1A3A6B')
    .optional()
    .or(z.literal('')),
  emailSenderName: z.string().trim().max(128).optional().or(z.literal('')),
  moduleAttendance: z.coerce.boolean().optional(),
  moduleLeave: z.coerce.boolean().optional(),
  modulePayroll: z.coerce.boolean().optional(),
  moduleShifts: z.coerce.boolean().optional(),
  moduleDocuments: z.coerce.boolean().optional(),
  geofencing: z.coerce.boolean().optional(),
  payroll3pl: z.coerce.boolean().optional(),
  selfiePunch: z.coerce.boolean().optional(),
  sso: z.coerce.boolean().optional(),
});

export const platformStatusChangeSchema = z.object({
  companyId: z.string().min(1),
  status: companyStatusSchema,
  confirmPhrase: z.string().trim().min(1),
});

export const platformProvisionExtendedSchema = z.object({
  companyName: z.string().trim().min(2).max(128),
  slug: slugSchema,
  adminName: z.string().trim().min(2).max(128),
  adminEmail: z.string().trim().email().toLowerCase(),
  adminPassword: z.string().min(8).max(256),
  plan: z.string().trim().min(1).max(32).default('free'),
  maxEmployees: z.coerce.number().int().min(1).max(100000).default(50),
  timezone: z.string().trim().min(1).max(64).optional().default('Asia/Kolkata'),
  currency: z.string().trim().min(1).max(8).optional().default('INR'),
});
