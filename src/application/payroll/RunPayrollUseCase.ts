import { PayrollItemCategory, ResidentTaxMethod, WithholdingType } from '@prisma/client';

import { PayrollCalculator } from '@/domain/payroll/PayrollCalculator';
import type {
  AllowanceEntry,
  DeductionEntry,
  EmployeeSnapshot,
} from '@/domain/payroll/types';
import type { PayrollCalculationResult, AllowanceInput, DeductionInput } from '@/types/payroll';

export type RunPayrollCommand = {
  employeeId: number;
  payrollDate: Date;
  periodStart: Date;
  periodEnd: Date;
  baseSalary: number;
  overtimeHours?: number;
  overtimeRate?: number;
  allowances?: AllowanceInput[];
  deductions?: DeductionInput[];
  bonusAmount?: number;
};

export type EmployeeRecord = {
  id: number;
  socialInsuranceProfile?: {
    standardMonthlyRemuneration?: number | null;
    healthInsuranceGrade?: number | null;
    nursingCareApplicable?: boolean | null;
    employmentInsuranceApplicable?: boolean | null;
    workersCompensationClass?: string | null;
  } | null;
  taxProfile?: {
    employeeId: number;
    dependentsCount: number;
    residentTaxMethod: ResidentTaxMethod;
    withholdingType: WithholdingType;
  } | null;
};

export type EmployeeAllowanceRecord = {
  code: string;
  name: string;
  category: PayrollItemCategory;
  amount: number;
  taxable: boolean;
};

export type EmployeeDeductionRecord = {
  code: string;
  name: string;
  category: PayrollItemCategory;
  amount: number;
};

export type PayrollItemDefinitionRecord = {
  code: string;
  name: string;
  category: PayrollItemCategory;
  taxable: boolean;
};

export interface PayrollCalculationGateway {
  getEmployeeById(employeeId: number): Promise<EmployeeRecord | null>;
  getActiveAllowances(employeeId: number, payrollDate: Date): Promise<EmployeeAllowanceRecord[]>;
  getActiveDeductions(employeeId: number, payrollDate: Date): Promise<EmployeeDeductionRecord[]>;
  getItemDefinitions(codes: string[]): Promise<PayrollItemDefinitionRecord[]>;
}

export class RunPayrollUseCase {
  constructor(
    private readonly gateway: PayrollCalculationGateway,
    private readonly calculator: PayrollCalculator,
  ) {}

  async execute(command: RunPayrollCommand): Promise<PayrollCalculationResult> {
    const employeeRecord = await this.gateway.getEmployeeById(command.employeeId);
    if (!employeeRecord) {
      throw new Error(`Employee ${command.employeeId} not found`);
    }

    const payrollDate = command.payrollDate;

    const [masterAllowances, masterDeductions] = await Promise.all([
      this.gateway.getActiveAllowances(command.employeeId, payrollDate),
      this.gateway.getActiveDeductions(command.employeeId, payrollDate),
    ]);

    const manualCodes = new Set<string>();
    (command.allowances ?? []).forEach((allowance) => manualCodes.add(allowance.itemCode));
    (command.deductions ?? []).forEach((deduction) => manualCodes.add(deduction.itemCode));

    const manualDefinitions = manualCodes.size > 0
      ? await this.gateway.getItemDefinitions(Array.from(manualCodes))
      : [];
    const manualDefinitionMap = new Map(manualDefinitions.map((definition) => [definition.code, definition]));

    const allowances: AllowanceEntry[] = [
      ...masterAllowances.map((allowance) => ({
        code: allowance.code,
        name: allowance.name,
        category: allowance.category,
        amount: allowance.amount,
        taxable: allowance.taxable,
      })),
      ...(command.allowances ?? []).map((allowance) => this.mapManualAllowance(allowance, manualDefinitionMap)),
    ];

    const deductions: DeductionEntry[] = [
      ...masterDeductions.map((deduction) => ({
        code: deduction.code,
        name: deduction.name,
        category: deduction.category,
        amount: deduction.amount,
      })),
      ...(command.deductions ?? []).map((deduction) => this.mapManualDeduction(deduction, manualDefinitionMap)),
    ];

    const employeeSnapshot = this.toEmployeeSnapshot(employeeRecord);

    return this.calculator.calculate({
      employee: employeeSnapshot,
      payrollDate,
      baseSalary: command.baseSalary,
      overtimeHours: command.overtimeHours,
      overtimeRate: command.overtimeRate,
      allowances,
      deductions,
      bonusAmount: command.bonusAmount,
    });
  }

  private mapManualAllowance(
    allowance: AllowanceInput,
    definitionMap: Map<string, PayrollItemDefinitionRecord>,
  ): AllowanceEntry {
    const definition = definitionMap.get(allowance.itemCode);
    return {
      code: allowance.itemCode,
      name: definition?.name ?? allowance.itemCode,
      category: definition?.category ?? PayrollItemCategory.ALLOWANCE,
      amount: Number(allowance.amount),
      taxable: definition?.taxable ?? true,
    };
  }

  private mapManualDeduction(
    deduction: DeductionInput,
    definitionMap: Map<string, PayrollItemDefinitionRecord>,
  ): DeductionEntry {
    const definition = definitionMap.get(deduction.itemCode);
    return {
      code: deduction.itemCode,
      name: definition?.name ?? deduction.itemCode,
      category: definition?.category ?? PayrollItemCategory.DEDUCTION,
      amount: Number(deduction.amount),
    };
  }

  private toEmployeeSnapshot(record: EmployeeRecord): EmployeeSnapshot {
    const snapshot: EmployeeSnapshot = {
      id: record.id,
    };

    if (record.socialInsuranceProfile) {
      snapshot.socialInsurance = {
        standardMonthlyRemuneration: record.socialInsuranceProfile.standardMonthlyRemuneration ?? null,
        healthInsuranceGrade: record.socialInsuranceProfile.healthInsuranceGrade ?? null,
        nursingCareApplicable: record.socialInsuranceProfile.nursingCareApplicable ?? null,
        employmentInsuranceApplicable: record.socialInsuranceProfile.employmentInsuranceApplicable ?? null,
        workersCompensationClass: record.socialInsuranceProfile.workersCompensationClass ?? null,
      };
    }

    if (record.taxProfile) {
      snapshot.tax = {
        employeeId: record.taxProfile.employeeId,
        dependentsCount: record.taxProfile.dependentsCount,
        residentTaxMethod: record.taxProfile.residentTaxMethod,
        withholdingType: record.taxProfile.withholdingType,
      };
    }

    return snapshot;
  }
}
