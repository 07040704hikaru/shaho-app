import { prisma } from '@/lib/prisma';
import {
  Employee,
  EmployeeSocialInsurance,
  EmployeeTaxProfile,
  PayrollItemCategory,
} from '@prisma/client';

import type {
  PayrollBreakdownItem,
  PayrollCalculationInput,
  PayrollCalculationResult,
} from '@/types/payroll';

import { calculateSocialInsurance } from './socialInsurance';
import { calculateIncomeTax } from './tax';

const DEFAULT_OVERTIME_BASE_DIVISOR = 160; // monthly working hours baseline for fallback

async function getEmployeeContext(id: number): Promise<
  | (Employee & {
      socialInsuranceProfile: EmployeeSocialInsurance | null;
      taxProfile: EmployeeTaxProfile | null;
    })
  | null
> {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      socialInsuranceProfile: true,
      taxProfile: true,
    },
  });
}

function resolveOvertimePay(input: PayrollCalculationInput): number {
  const hours = input.overtimeHours ?? 0;
  if (!hours) return 0;

  const overtimeRate = input.overtimeRate ?? input.baseSalary / DEFAULT_OVERTIME_BASE_DIVISOR * 1.25;
  return Number((hours * overtimeRate).toFixed(2));
}

async function collectMasterAllowances(employeeId: number, payrollDate: Date) {
  return prisma.employeeAllowance.findMany({
    where: {
      employeeId,
      startDate: { lte: payrollDate },
      OR: [{ endDate: null }, { endDate: { gte: payrollDate } }],
    },
    include: { item: true },
  });
}

async function collectMasterDeductions(employeeId: number, payrollDate: Date) {
  return prisma.employeeDeduction.findMany({
    where: {
      employeeId,
      startDate: { lte: payrollDate },
      OR: [{ endDate: null }, { endDate: { gte: payrollDate } }],
    },
    include: { item: true },
  });
}

async function resolveItemDefinitions(codes: string[]) {
  if (codes.length === 0) return [];
  return prisma.payrollItemDefinition.findMany({
    where: {
      code: { in: codes },
    },
  });
}

export async function calculatePayroll(
  input: PayrollCalculationInput,
): Promise<PayrollCalculationResult> {
  const payrollDate = new Date(input.payrollDate);
  const employee = await getEmployeeContext(input.employeeId);

  if (!employee) {
    throw new Error(`Employee ${input.employeeId} not found`);
  }

  const masterAllowances = await collectMasterAllowances(employee.id, payrollDate);
  const masterDeductions = await collectMasterDeductions(employee.id, payrollDate);

  const inputAllowanceCodes = input.allowances?.map((item) => item.itemCode) ?? [];
  const inputDeductionCodes = input.deductions?.map((item) => item.itemCode) ?? [];

  const manualDefinitions = await resolveItemDefinitions([...new Set([...inputAllowanceCodes, ...inputDeductionCodes])]);
  const manualDefinitionMap = new Map(manualDefinitions.map((item) => [item.code, item]));

  const overtimePay = resolveOvertimePay(input);
  const baseSalary = input.baseSalary;

  const allowanceBreakdown: PayrollBreakdownItem[] = [];
  let allowancesTotal = 0;
  let taxableAllowanceTotal = 0;

  masterAllowances.forEach(({ item, amount }) => {
    const amountNumber = Number(amount);
    allowancesTotal += amountNumber;
    if (item.taxable) {
      taxableAllowanceTotal += amountNumber;
    }
    allowanceBreakdown.push({
      code: item.code,
      name: item.name,
      category: item.category,
      employeePortion: amountNumber,
    });
  });

  input.allowances?.forEach((allowance) => {
    const definition = manualDefinitionMap.get(allowance.itemCode);
    const amountNumber = Number(allowance.amount);
    allowancesTotal += amountNumber;
    if (!definition || definition.taxable) {
      taxableAllowanceTotal += amountNumber;
    }
    allowanceBreakdown.push({
      code: allowance.itemCode,
      name: definition?.name ?? allowance.itemCode,
      category: definition?.category ?? PayrollItemCategory.ALLOWANCE,
      employeePortion: amountNumber,
    });
  });

  const deductionBreakdown: PayrollBreakdownItem[] = [];
  let deductionTotal = 0;

  masterDeductions.forEach(({ item, amount }) => {
    const amountNumber = Number(amount);
    deductionTotal += amountNumber;
    deductionBreakdown.push({
      code: item.code,
      name: item.name,
      category: item.category,
      employeePortion: amountNumber,
    });
  });

  input.deductions?.forEach((deduction) => {
    const definition = manualDefinitionMap.get(deduction.itemCode);
    const amountNumber = Number(deduction.amount);
    deductionTotal += amountNumber;
    deductionBreakdown.push({
      code: deduction.itemCode,
      name: definition?.name ?? deduction.itemCode,
      category: definition?.category ?? PayrollItemCategory.DEDUCTION,
      employeePortion: amountNumber,
    });
  });

  const bonusAmount = Number(input.bonusAmount ?? 0);

  const grossPay = baseSalary + allowancesTotal + overtimePay + bonusAmount;
  const taxableIncomeBase =
    baseSalary + taxableAllowanceTotal + overtimePay + (bonusAmount > 0 ? bonusAmount : 0);

  const socialInsuranceComponents = await calculateSocialInsurance({
    payrollDate,
    employee,
    standardMonthlyRemuneration: employee.socialInsuranceProfile?.standardMonthlyRemuneration
      ? Number(employee.socialInsuranceProfile.standardMonthlyRemuneration)
      : baseSalary,
    bonusAmount,
  });

  const socialInsuranceEmployeeTotal = socialInsuranceComponents.reduce(
    (total, component) => total + Number(component.employeePortion ?? 0),
    0,
  );

  const { incomeTax, residentTax } = await calculateIncomeTax({
    payrollDate,
    employee,
    taxableIncome: taxableIncomeBase - socialInsuranceEmployeeTotal,
    bonusAmount: bonusAmount > 0 ? bonusAmount : undefined,
  });

  const netPay =
    grossPay - socialInsuranceEmployeeTotal - incomeTax - residentTax - deductionTotal;

  const breakdown: PayrollBreakdownItem[] = [
    {
      code: 'BASE_SALARY',
      name: '基本給',
      category: PayrollItemCategory.EARNING,
      employeePortion: baseSalary,
    },
  ];

  if (overtimePay) {
    breakdown.push({
      code: 'OVERTIME',
      name: '時間外手当',
      category: PayrollItemCategory.ALLOWANCE,
      employeePortion: overtimePay,
    });
  }

  breakdown.push(...allowanceBreakdown);

  if (bonusAmount) {
    breakdown.push({
      code: 'BONUS',
      name: '賞与',
      category: PayrollItemCategory.BONUS,
      employeePortion: bonusAmount,
    });
  }

  socialInsuranceComponents.forEach((component) => {
    breakdown.push({
      code: `SOCIAL_${component.type.toUpperCase()}`,
      name: socialInsuranceLabel(component.type),
      category: PayrollItemCategory.SOCIAL_INSURANCE,
      employeePortion: component.employeePortion,
      employerPortion: component.employerPortion,
    });
  });

  if (incomeTax > 0) {
    breakdown.push({
      code: 'INCOME_TAX',
      name: '源泉所得税',
      category: PayrollItemCategory.TAX,
      employeePortion: incomeTax,
    });
  }

  if (residentTax > 0) {
    breakdown.push({
      code: 'RESIDENT_TAX',
      name: '住民税',
      category: PayrollItemCategory.TAX,
      employeePortion: residentTax,
    });
  }

  breakdown.push(...deductionBreakdown);

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

function socialInsuranceLabel(type: string): string {
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
