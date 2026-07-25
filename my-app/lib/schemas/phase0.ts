import { z } from 'zod';

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens');

export const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(128),
  slug: slugSchema,
  name: z.string().trim().min(2).max(128),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(256),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
  next: z.string().optional(),
  companyId: z.string().optional(),
});

export const platformProvisionSchema = z.object({
  companyName: z.string().trim().min(2).max(128),
  slug: slugSchema,
  adminName: z.string().trim().min(2).max(128),
  adminEmail: z.string().trim().email().toLowerCase(),
  adminPassword: z.string().min(8).max(256),
  plan: z.string().trim().min(1).max(32).default('free'),
  maxEmployees: z.coerce.number().int().min(1).max(100000).default(50),
});

export const updateCompanySettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().trim().min(1).max(8),
  workWeek: z.string().trim().min(1).max(128),
  jurisdictions: z.string().trim().min(1).max(256),
  departments: z.string().trim().max(2048).optional().or(z.literal('')),
  designations: z.string().trim().max(2048).optional().or(z.literal('')),
  logoUrl: z.string().trim().max(512).optional().or(z.literal('')),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Use hex color like #1A3A6B')
    .optional()
    .or(z.literal('')),
  emailSenderName: z.string().trim().max(128).optional().or(z.literal('')),
});

export const updateCompanyPlanSchema = z.object({
  companyId: z.string().min(1),
  plan: z.string().trim().min(1).max(32),
  maxEmployees: z.coerce.number().int().min(1).max(100000),
  status: z.enum(['active', 'suspended', 'pending']),
  payroll3pl: z.coerce.boolean().optional(),
  geofencing: z.coerce.boolean().optional(),
  selfiePunch: z.coerce.boolean().optional(),
  sso: z.coerce.boolean().optional(),
});

export const selectCompanySchema = z.object({
  companyId: z.string().min(1),
});
