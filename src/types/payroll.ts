export type PayrollItemCategory = string;

export type IncomeTaxTableType = string;

export type AllowanceFrequency = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';

export type AllowanceInput = {
  itemCode: string;
  amount: number;
  frequency?: AllowanceFrequency;
};

export type DeductionInput = {
  itemCode: string;
  amount: number;
};

export type PayrollCalculationInput = {
  employeeId: number;
  payrollDate: string; // ISO date
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  overtimeHours?: number;
  overtimeRate?: number;
  allowances?: AllowanceInput[];
  deductions?: DeductionInput[];
  bonusAmount?: number;
  includeResidentTax?: boolean;
};

export type PayrollBreakdownItem = {
  code: string;
  name: string;
  category: PayrollItemCategory;
  employeePortion: number;
  employerPortion?: number;
};

export type InsuranceComponent = {
  type: string;
  employeePortion: number;
  employerPortion: number;
};

export type IncomeTaxLookupCriteria = {
  tableType: IncomeTaxTableType;
  dependents: number;
  taxableIncome: number;
};

export type PayrollCalculationResult = {
  grossPay: number;
  socialInsurance: InsuranceComponent[];
  taxableIncome: number;
  incomeTax: number;
  residentTax: number;
  netPay: number;
  breakdown: PayrollBreakdownItem[];
};
