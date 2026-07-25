import type { SalaryComponent } from '@/lib/appwrite/types';

export const SALARY_AMOUNT_FIELDS = [
  'basic',
  'hra',
  'specialAllowance',
  'otherEarnings',
  'deductions',
] as const;

export type SalaryAmountField = (typeof SALARY_AMOUNT_FIELDS)[number];
export type SalaryAmounts = Record<SalaryAmountField, number>;

export function zeroSalaryAmounts(): SalaryAmounts {
  return {
    basic: 0,
    hra: 0,
    specialAllowance: 0,
    otherEarnings: 0,
    deductions: 0,
  };
}

export function defaultSalaryComponents(): SalaryComponent[] {
  return buildSalaryComponents(zeroSalaryAmounts());
}

export function buildSalaryComponents(amounts: SalaryAmounts): SalaryComponent[] {
  return [
    { key: 'basic', label: 'Basic', amount: amounts.basic, type: 'earning' },
    { key: 'hra', label: 'HRA', amount: amounts.hra, type: 'earning' },
    {
      key: 'specialAllowance',
      label: 'Special Allowance',
      amount: amounts.specialAllowance,
      type: 'earning',
    },
    {
      key: 'otherEarnings',
      label: 'Other Earnings',
      amount: amounts.otherEarnings,
      type: 'earning',
    },
    {
      key: 'deductions',
      label: 'Deductions',
      amount: amounts.deductions,
      type: 'deduction',
    },
  ];
}

export function computeCtcMonthly(amounts: SalaryAmounts): number {
  return (
    amounts.basic +
    amounts.hra +
    amounts.specialAllowance +
    amounts.otherEarnings -
    amounts.deductions
  );
}

export function salaryAmountsFromComponents(
  components: SalaryComponent[] | undefined | null,
): SalaryAmounts {
  const amounts = zeroSalaryAmounts();
  for (const component of components ?? []) {
    if (component.key in amounts) {
      amounts[component.key as SalaryAmountField] = Number(component.amount || 0);
    }
  }
  return amounts;
}
