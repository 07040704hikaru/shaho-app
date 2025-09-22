import type { InsuranceComponent } from '@/types/payroll';

import type { EmployeeSnapshot } from '../types';

export type SocialInsuranceCalculationInput = {
  payrollDate: Date;
  employee: EmployeeSnapshot;
  standardMonthlyRemuneration: number;
  bonusAmount: number;
};

export interface SocialInsuranceCalculator {
  calculate(input: SocialInsuranceCalculationInput): Promise<InsuranceComponent[]>;
}
