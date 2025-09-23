import type {
  EmployeeAllowanceRecord,
  EmployeeDeductionRecord,
  EmployeeRecord,
  PayrollCalculationGateway,
  PayrollItemDefinitionRecord,
} from '@/application/payroll/RunPayrollUseCase';
import { prisma } from '@/lib/prisma';

export class PrismaPayrollCalculationGateway implements PayrollCalculationGateway {
  async getEmployeeById(employeeId: number): Promise<EmployeeRecord | null> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        socialInsuranceProfile: true,
        taxProfile: true,
        payrollMaster: true,
      },
    });

    if (!employee) {
      return null;
    }

    return {
      id: employee.id,
      socialInsuranceProfile: employee.socialInsuranceProfile
        ? {
            standardMonthlyRemuneration: employee.socialInsuranceProfile.standardMonthlyRemuneration
              ? Number(employee.socialInsuranceProfile.standardMonthlyRemuneration)
              : null,
            healthInsuranceGrade: employee.socialInsuranceProfile.healthInsuranceGrade,
            nursingCareApplicable: employee.socialInsuranceProfile.nursingCareApplicable,
            employmentInsuranceApplicable: employee.socialInsuranceProfile.employmentInsuranceApplicable,
            workersCompensationClass: employee.socialInsuranceProfile.workersCompensationClass,
          }
        : null,
      taxProfile: employee.taxProfile
        ? {
            employeeId: employee.taxProfile.employeeId,
            dependentsCount: employee.taxProfile.dependentsCount,
            residentTaxMethod: employee.taxProfile.residentTaxMethod,
            withholdingType: employee.taxProfile.withholdingType,
          }
        : null,
      payrollMaster: employee.payrollMaster
        ? {
            salaryType: employee.payrollMaster.salaryType,
            baseSalary: Number(employee.payrollMaster.baseSalary),
            overtimeDivisor: employee.payrollMaster.overtimeDivisor,
            overtimeMultiplier: employee.payrollMaster.overtimeMultiplier
              ? Number(employee.payrollMaster.overtimeMultiplier)
              : null,
            socialInsuranceProfileId: employee.payrollMaster.socialInsuranceProfileId,
            taxProfileId: employee.payrollMaster.taxProfileId,
            residentTaxNoticeId: employee.payrollMaster.residentTaxNoticeId,
          }
        : null,
    };
  }

  async getActiveAllowances(employeeId: number, payrollDate: Date): Promise<EmployeeAllowanceRecord[]> {
    const allowances = await prisma.employeeAllowance.findMany({
      where: {
        employeeId,
        startDate: { lte: payrollDate },
        OR: [{ endDate: null }, { endDate: { gte: payrollDate } }],
      },
      include: { item: true },
    });

    return allowances.map((allowance) => ({
      code: allowance.item.code,
      name: allowance.item.name,
      category: allowance.item.category,
      amount: Number(allowance.amount),
      taxable:
        allowance.taxableOverride != null
          ? allowance.taxableOverride
          : allowance.item.taxable,
    }));
  }

  async getActiveDeductions(employeeId: number, payrollDate: Date): Promise<EmployeeDeductionRecord[]> {
    const deductions = await prisma.employeeDeduction.findMany({
      where: {
        employeeId,
        startDate: { lte: payrollDate },
        OR: [{ endDate: null }, { endDate: { gte: payrollDate } }],
      },
      include: { item: true },
    });

    return deductions.map((deduction) => ({
      code: deduction.item.code,
      name: deduction.item.name,
      category: deduction.item.category,
      amount: Number(deduction.amount),
    }));
  }

  async getItemDefinitions(codes: string[]): Promise<PayrollItemDefinitionRecord[]> {
    if (codes.length === 0) {
      return [];
    }

    const definitions = await prisma.payrollItemDefinition.findMany({
      where: { code: { in: codes } },
    });

    return definitions.map((definition) => ({
      code: definition.code,
      name: definition.name,
      category: definition.category,
      taxable: definition.taxable,
    }));
  }
}
