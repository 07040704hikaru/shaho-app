import type { PayrollSalaryType, ResidentTaxMethod, WithholdingType } from '@prisma/client';

import type { PayrollItemCategory } from '@/types/payroll';

export type EmployeeSocialInsuranceSnapshot = {
  standardMonthlyRemuneration?: number | null;
  healthInsuranceGrade?: number | null;
  nursingCareApplicable?: boolean | null;
  employmentInsuranceApplicable?: boolean | null;
  workersCompensationClass?: string | null;
};

export type EmployeeTaxSnapshot = {
  employeeId: number;
  dependentsCount: number;
  residentTaxMethod: ResidentTaxMethod;
  withholdingType: WithholdingType;
};

export type PayrollMasterSnapshot = {
  salaryType: PayrollSalaryType;
  baseSalary: number;
  overtimeDivisor?: number | null;
  overtimeMultiplier?: number | null;
};

export type EmployeeSnapshot = {
  id: number;
  socialInsurance?: EmployeeSocialInsuranceSnapshot | null;
  tax?: EmployeeTaxSnapshot | null;
  payrollMaster?: PayrollMasterSnapshot | null;
};

export type AllowanceEntry = {
  code: string;
  name: string;
  category: PayrollItemCategory;
  amount: number;
  taxable: boolean;
};

export type DeductionEntry = {
  code: string;
  name: string;
  category: PayrollItemCategory;
  amount: number;
};

export type PayrollCalculationContext = {
  employee: EmployeeSnapshot;
  payrollDate: Date;
  baseSalary: number;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimeDivisor?: number;
  overtimeMultiplier?: number;
  allowances: AllowanceEntry[];
  deductions: DeductionEntry[];
  bonusAmount?: number;
};
