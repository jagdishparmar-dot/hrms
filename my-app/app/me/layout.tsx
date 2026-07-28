import type { ReactNode } from 'react';

import { EmployeeShell } from '@/components/employee-shell';

export default function MeLayout({ children }: { children: ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
