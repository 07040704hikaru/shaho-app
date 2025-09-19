import { prisma } from '@/lib/prisma';
import {
  Employee,
  EmployeeTaxProfile,
  IncomeTaxBracket,
  IncomeTaxTableType,
  ResidentTaxMethod,
} from '@prisma/client';

import type { IncomeTaxLookupCriteria } from '@/types/payroll';

type TaxCalculationContext = {
  payrollDate: Date;
  employee: Employee & { taxProfile?: EmployeeTaxProfile | null };
  taxableIncome: number;
  bonusAmount?: number;
};

async function findIncomeTaxBracket({
  tableType,
  dependents,
  taxableIncome,
}: IncomeTaxLookupCriteria): Promise<IncomeTaxBracket | null> {
  return prisma.incomeTaxBracket.findFirst({
    where: {
      tableType,
      dependents,
      lowerBound: { lte: Math.round(taxableIncome) },
      OR: [{ upperBound: null }, { upperBound: { gte: Math.round(taxableIncome) } }],
    },
    orderBy: [{ effectiveFrom: 'desc' }],
  });
}

export async function calculateIncomeTax({
  payrollDate,
  employee,
  taxableIncome,
  bonusAmount,
}: TaxCalculationContext): Promise<{ incomeTax: number; residentTax: number }> {
  const profile = employee.taxProfile;
  if (!profile) {
    return { incomeTax: 0, residentTax: 0 };
  }

  const dependents = profile.dependentsCount;
  const tableType = bonusAmount && bonusAmount > 0 ? IncomeTaxTableType.BONUS : IncomeTaxTableType.MONTHLY;

  const applicableIncome = bonusAmount && bonusAmount > 0 ? bonusAmount : taxableIncome;

  const bracket = await findIncomeTaxBracket({
    tableType,
    dependents,
    taxableIncome: applicableIncome,
  });

  const incomeTax = bracket ? Math.max(0, Number(bracket.taxAmount) - Number(bracket.deduction)) : 0;

  const residentTax = await calculateResidentTax(payrollDate, profile, taxableIncome);

  return { incomeTax, residentTax };
}

async function calculateResidentTax(
  payrollDate: Date,
  profile: EmployeeTaxProfile,
  taxableIncome: number,
): Promise<number> {
  if (profile.residentTaxMethod !== ResidentTaxMethod.SPECIAL_COLLECTION) {
    return 0;
  }

  const withholdHistory = await prisma.taxWithholdingHistory.findFirst({
    where: {
      employeeId: profile.employeeId,
      tableType: IncomeTaxTableType.MONTHLY,
      effectiveDate: { lte: payrollDate },
    },
    orderBy: [{ effectiveDate: 'desc' }],
  });

  if (withholdHistory) {
    return Number(withholdHistory.taxWithheld);
  }

  // fallback simple calculation: 10% of taxable income truncated
  return Math.floor(taxableIncome * 0.1);
}
