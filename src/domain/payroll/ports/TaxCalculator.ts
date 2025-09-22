import type { EmployeeSnapshot } from '../types';

export type TaxCalculationInput = {
  payrollDate: Date;
  employee: EmployeeSnapshot;
  taxableIncome: number;
  bonusAmount?: number;
};

export type TaxCalculationResult = {
  incomeTax: number;
  residentTax: number;
};

export interface TaxCalculator {
  calculate(input: TaxCalculationInput): Promise<TaxCalculationResult>;
}
