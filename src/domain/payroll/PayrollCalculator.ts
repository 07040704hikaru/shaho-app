import type { PayrollCalculationResult } from '@/types/payroll';
import { PayrollItemCategory } from '@prisma/client';

import type { SocialInsuranceCalculator } from './ports/SocialInsuranceCalculator';
import type { TaxCalculator } from './ports/TaxCalculator';
import type {
  AllowanceEntry,
  DeductionEntry,
  EmployeeSnapshot,
  PayrollCalculationContext,
} from './types';

const DEFAULT_OVERTIME_BASE_DIVISOR = 160;

function resolveOvertimePay({
  baseSalary,
  overtimeHours,
  overtimeRate,
}: Pick<PayrollCalculationContext, 'baseSalary' | 'overtimeHours' | 'overtimeRate'>): number {
  const hours = overtimeHours ?? 0;
  if (!hours) return 0;

  const rate =
    overtimeRate ?? ((baseSalary / DEFAULT_OVERTIME_BASE_DIVISOR) * 1.25);
  return Number((hours * rate).toFixed(2));
}

function createBreakdownFromAllowances(allowances: AllowanceEntry[]) {
  return allowances.map((allowance) => ({
    code: allowance.code,
    name: allowance.name,
    category: allowance.category,
    employeePortion: allowance.amount,
  }));
}

function createBreakdownFromDeductions(deductions: DeductionEntry[]) {
  return deductions.map((deduction) => ({
    code: deduction.code,
    name: deduction.name,
    category: deduction.category,
    employeePortion: deduction.amount,
  }));
}

export class PayrollCalculator {
  constructor(
    private readonly socialInsuranceCalculator: SocialInsuranceCalculator,
    private readonly taxCalculator: TaxCalculator,
  ) {}

  async calculate(context: PayrollCalculationContext): Promise<PayrollCalculationResult> {
    const overtimePay = resolveOvertimePay(context);

    const allowancesTotal = context.allowances.reduce((total, allowance) => total + allowance.amount, 0);
    const taxableAllowanceTotal = context.allowances
      .filter((allowance) => allowance.taxable)
      .reduce((total, allowance) => total + allowance.amount, 0);

    const deductionTotal = context.deductions.reduce((total, deduction) => total + deduction.amount, 0);

    const bonusAmount = Number(context.bonusAmount ?? 0);
    const grossPay = context.baseSalary + allowancesTotal + overtimePay + bonusAmount;

    const taxableIncomeBase =
      context.baseSalary + taxableAllowanceTotal + overtimePay + (bonusAmount > 0 ? bonusAmount : 0);

    const socialInsuranceComponents = await this.socialInsuranceCalculator.calculate({
      payrollDate: context.payrollDate,
      employee: context.employee,
      standardMonthlyRemuneration: this.resolveStandardRemuneration(context.employee, context.baseSalary),
      bonusAmount,
    });

    const socialInsuranceEmployeeTotal = socialInsuranceComponents.reduce(
      (total, component) => total + Number(component.employeePortion ?? 0),
      0,
    );

    const { incomeTax, residentTax } = await this.taxCalculator.calculate({
      payrollDate: context.payrollDate,
      employee: context.employee,
      taxableIncome: taxableIncomeBase - socialInsuranceEmployeeTotal,
      bonusAmount: bonusAmount > 0 ? bonusAmount : undefined,
    });

    const netPay = grossPay - socialInsuranceEmployeeTotal - incomeTax - residentTax - deductionTotal;

    const breakdown = [
      {
        code: 'BASE_SALARY',
        name: '基本給',
        category: PayrollItemCategory.EARNING,
        employeePortion: context.baseSalary,
      },
      ...(overtimePay
        ? [
            {
              code: 'OVERTIME',
              name: '時間外手当',
              category: PayrollItemCategory.ALLOWANCE,
              employeePortion: overtimePay,
            },
          ]
        : []),
      ...createBreakdownFromAllowances(context.allowances),
      ...(bonusAmount
        ? [
            {
              code: 'BONUS',
              name: '賞与',
              category: PayrollItemCategory.BONUS,
              employeePortion: bonusAmount,
            },
          ]
        : []),
      ...socialInsuranceComponents.map((component) => ({
        code: `SOCIAL_${component.type.toUpperCase()}`,
        name: this.socialInsuranceLabel(component.type),
        category: PayrollItemCategory.SOCIAL_INSURANCE,
        employeePortion: component.employeePortion,
        employerPortion: component.employerPortion,
      })),
      ...(incomeTax > 0
        ? [
            {
              code: 'INCOME_TAX',
              name: '源泉所得税',
              category: PayrollItemCategory.TAX,
              employeePortion: incomeTax,
            },
          ]
        : []),
      ...(residentTax > 0
        ? [
            {
              code: 'RESIDENT_TAX',
              name: '住民税',
              category: PayrollItemCategory.TAX,
              employeePortion: residentTax,
            },
          ]
        : []),
      ...createBreakdownFromDeductions(context.deductions),
    ];

    return {
      grossPay,
      socialInsurance: socialInsuranceComponents,
      taxableIncome: taxableIncomeBase,
      incomeTax,
      residentTax,
      netPay,
      breakdown,
    };
  }

  private resolveStandardRemuneration(employee: EmployeeSnapshot, baseSalary: number): number {
    const remuneration = employee.socialInsurance?.standardMonthlyRemuneration;
    return remuneration != null ? Number(remuneration) : baseSalary;
  }

  private socialInsuranceLabel(type: string): string {
    switch (type) {
      case 'health':
        return '健康保険';
      case 'nursing_care':
        return '介護保険';
      case 'pension':
        return '厚生年金';
      case 'employment':
        return '雇用保険';
      case 'workers_compensation':
        return '労災保険';
      default:
        return type;
    }
  }
}
