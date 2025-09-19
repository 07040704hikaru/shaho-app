import { prisma } from '@/lib/prisma';
import {
  Employee,
  EmployeeSocialInsurance,
  InsuranceRate,
  InsuranceType,
} from '@prisma/client';

import type { InsuranceComponent } from '@/types/payroll';

type SocialInsuranceContext = {
  payrollDate: Date;
  employee: Employee & { socialInsuranceProfile?: EmployeeSocialInsurance | null };
  standardMonthlyRemuneration?: number;
  bonusAmount?: number;
};

const ROUNDING_BASE = 1; // use yen rounding by truncation

function roundInsurance(amount: number): number {
  if (Number.isNaN(amount)) return 0;
  return Math.floor(amount / ROUNDING_BASE) * ROUNDING_BASE;
}

async function resolveInsuranceRate(
  type: InsuranceType,
  date: Date,
  remuneration?: number,
  grade?: number | null,
  businessCategory?: string | null,
): Promise<InsuranceRate | null> {
  return prisma.insuranceRate.findFirst({
    where: {
      insuranceType: type,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      AND: [
        grade != null ? { grade } : {},
        remuneration != null
          ? {
              OR: [
                { thresholdLow: null },
                {
                  AND: [
                    { thresholdLow: { lte: remuneration } },
                    { OR: [{ thresholdHigh: null }, { thresholdHigh: { gte: remuneration } }] },
                  ],
                },
              ],
            }
          : {},
        businessCategory ? { businessCategory } : {},
      ],
    },
    orderBy: [
      { grade: 'desc' },
      { thresholdLow: 'desc' },
      { effectiveFrom: 'desc' },
    ],
  });
}

export async function calculateSocialInsurance({
  payrollDate,
  employee,
  standardMonthlyRemuneration,
  bonusAmount,
}: SocialInsuranceContext): Promise<InsuranceComponent[]> {
  const profile = employee.socialInsuranceProfile;

  if (!profile) {
    return [];
  }

  const remuneration =
    standardMonthlyRemuneration ?? Number(profile.standardMonthlyRemuneration ?? 0);

  const components: InsuranceComponent[] = [];

  // Health insurance
  if (remuneration > 0) {
    const healthRate = await resolveInsuranceRate(
      InsuranceType.HEALTH,
      payrollDate,
      remuneration,
      profile.healthInsuranceGrade,
    );

    if (healthRate) {
      const employeePortion = roundInsurance(remuneration * Number(healthRate.employeeRate));
      const employerPortion = roundInsurance(remuneration * Number(healthRate.employerRate));

      components.push({
        type: 'health',
        employeePortion,
        employerPortion,
      });
    }
  }

  // Nursing care (介護保険) only if applicable
  if (profile.nursingCareApplicable && remuneration > 0) {
    const nursingRate = await resolveInsuranceRate(InsuranceType.NURSING, payrollDate, remuneration);
    if (nursingRate) {
      const employeePortion = roundInsurance(remuneration * Number(nursingRate.employeeRate));
      const employerPortion = roundInsurance(remuneration * Number(nursingRate.employerRate));
      components.push({
        type: 'nursing_care',
        employeePortion,
        employerPortion,
      });
    }
  }

  // Welfare pension (厚生年金)
  if (remuneration > 0) {
    const pensionRate = await resolveInsuranceRate(
      InsuranceType.PENSION,
      payrollDate,
      remuneration,
      profile.healthInsuranceGrade,
    );

    if (pensionRate) {
      const employeePortion = roundInsurance(remuneration * Number(pensionRate.employeeRate));
      const employerPortion = roundInsurance(remuneration * Number(pensionRate.employerRate));
      components.push({
        type: 'pension',
        employeePortion,
        employerPortion,
      });
    }
  }

  if (profile.employmentInsuranceApplicable) {
    const employmentRate = await resolveInsuranceRate(InsuranceType.EMPLOYMENT, payrollDate);
    if (employmentRate) {
      const targetAmount = bonusAmount && bonusAmount > 0 ? bonusAmount : remuneration;
      const employeePortion = roundInsurance(targetAmount * Number(employmentRate.employeeRate));
      const employerPortion = roundInsurance(targetAmount * Number(employmentRate.employerRate));
      components.push({
        type: 'employment',
        employeePortion,
        employerPortion,
      });
    }
  }

  const workersRate = await resolveInsuranceRate(
    InsuranceType.WORKERS,
    payrollDate,
    undefined,
    undefined,
    profile.workersCompensationClass,
  );

  if (workersRate) {
    const targetAmount = bonusAmount && bonusAmount > 0 ? bonusAmount : remuneration;
    const employerPortion = roundInsurance(targetAmount * Number(workersRate.employerRate));
    components.push({
      type: 'workers_compensation',
      employeePortion: 0,
      employerPortion,
    });
  }

  return components;
}
