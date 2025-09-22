import { calculateSocialInsurance } from '@/lib/calculations/socialInsurance';

import type {
  SocialInsuranceCalculationInput,
  SocialInsuranceCalculator,
} from '@/domain/payroll/ports/SocialInsuranceCalculator';

export class PrismaSocialInsuranceCalculator implements SocialInsuranceCalculator {
  async calculate({ payrollDate, employee, standardMonthlyRemuneration, bonusAmount }: SocialInsuranceCalculationInput) {
    return calculateSocialInsurance({
      payrollDate,
      profile: employee.socialInsurance,
      standardMonthlyRemuneration,
      bonusAmount,
    });
  }
}
