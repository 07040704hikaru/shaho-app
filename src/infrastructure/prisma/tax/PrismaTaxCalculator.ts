import { calculateIncomeTax } from '@/lib/calculations/tax';

import type { TaxCalculator, TaxCalculationInput } from '@/domain/payroll/ports/TaxCalculator';

export class PrismaTaxCalculator implements TaxCalculator {
  async calculate({ payrollDate, employee, taxableIncome, bonusAmount }: TaxCalculationInput) {
    return calculateIncomeTax({
      payrollDate,
      taxProfile: employee.tax,
      taxableIncome,
      bonusAmount,
    });
  }
}
