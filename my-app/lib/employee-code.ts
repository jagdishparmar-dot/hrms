import type { CompanySettings } from '@/lib/appwrite/types';

export interface EmployeeCodeConfig {
  prefix: string;
  nextSequence: number;
  padding: number;
  autoGenerate: boolean;
}

export function employeeCodeConfigFromSettings(
  settings: CompanySettings,
): EmployeeCodeConfig {
  return {
    prefix: (settings.employeeCodePrefix ?? 'EMP').trim() || 'EMP',
    nextSequence: Math.max(1, settings.employeeCodeNextSequence ?? 1),
    padding: Math.min(8, Math.max(1, settings.employeeCodePadding ?? 4)),
    autoGenerate: settings.employeeCodeAutoGenerate !== false,
  };
}

export function formatEmployeeCode(
  config: Pick<EmployeeCodeConfig, 'prefix' | 'padding'>,
  sequence: number,
): string {
  return `${config.prefix}${String(sequence).padStart(config.padding, '0')}`;
}

export function previewNextEmployeeCode(settings: CompanySettings): string {
  const config = employeeCodeConfigFromSettings(settings);
  return formatEmployeeCode(config, config.nextSequence);
}

/** True when the server should allocate the next sequential code on create. */
export function shouldAllocateEmployeeCode(
  settings: CompanySettings,
  submittedCode: string,
): boolean {
  const config = employeeCodeConfigFromSettings(settings);
  if (!config.autoGenerate) return false;
  const trimmed = submittedCode.trim();
  if (!trimmed) return true;
  // Treat stale preview values (pre-filled forms) as "request auto assign".
  return trimmed === previewNextEmployeeCode(settings);
}
