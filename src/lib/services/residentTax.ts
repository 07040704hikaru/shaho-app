import { Prisma, PayrollRunType } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type ResidentTaxCsvRow = {
  employeeCode: string;
  fiscalYear: number;
  annualTax: number;
  bonusWithholding?: number;
  startMonth?: number;
  remarks?: string;
};

export type ResidentTaxImportResult = {
  employeeCode: string;
  fiscalYear: number;
  status: 'PREVIEW' | 'CREATED' | 'UPDATED';
  noticeId?: number;
  allocations: Array<{
    month: number;
    year: number;
    baseAmount: number;
    bonusAmount?: number;
    payRunType: PayrollRunType;
  }>;
  message?: string;
};

export function parseResidentTaxCsv(csv: string): ResidentTaxCsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(',').map((value) => value.trim());

  const requiredHeaders = ['employeeCode', 'fiscalYear', 'annualTax'];
  requiredHeaders.forEach((header) => {
    if (!headers.includes(header)) {
      throw new Error(`CSV のヘッダーに ${header} が含まれていません`);
    }
  });

  return dataLines.map((line, index) => {
    const cells = line.split(',').map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] ?? '';
    });

    const fiscalYear = Number(row.fiscalYear);
    const annualTax = Number(row.annualTax);
    const bonusWithholding = row.bonusWithholding ? Number(row.bonusWithholding) : undefined;
    const startMonth = row.startMonth ? Number(row.startMonth) : undefined;

    if (!row.employeeCode) {
      throw new Error(`${index + 1} 行目: employeeCode が空です`);
    }
    if (!Number.isInteger(fiscalYear)) {
      throw new Error(`${index + 1} 行目: fiscalYear が数値ではありません`);
    }
    if (Number.isNaN(annualTax)) {
      throw new Error(`${index + 1} 行目: annualTax が数値ではありません`);
    }

    return {
      employeeCode: row.employeeCode,
      fiscalYear,
      annualTax,
      bonusWithholding,
      startMonth,
      remarks: row.remarks || undefined,
    };
  });
}

function distribute(amount: number, periods: number): number[] {
  const base = Math.floor(amount / periods);
  let remainder = Math.round(amount - base * periods);

  return Array.from({ length: periods }).map((_, index) => {
    if (remainder > 0) {
      remainder -= 1;
      return base + 1;
    }
    return base;
  });
}

function buildSchedule(row: ResidentTaxCsvRow): ResidentTaxImportResult['allocations'] {
  const startMonth = row.startMonth ?? 6;
  const months = 12;
  const monthlyBaseAmount = Math.max(0, row.annualTax - (row.bonusWithholding ?? 0));
  const monthlyAllocations = distribute(monthlyBaseAmount, months);

  const allocations: ResidentTaxImportResult['allocations'] = monthlyAllocations.map((amount, index) => {
    const month = ((startMonth - 1 + index) % 12) + 1;
    const yearOffset = month >= startMonth ? 0 : 1;
    return {
      month,
      year: row.fiscalYear + yearOffset,
      baseAmount: Math.round(amount),
      payRunType: PayrollRunType.REGULAR,
    };
  });

  if (row.bonusWithholding && row.bonusWithholding > 0) {
    allocations.push({
      month: startMonth,
      year: row.fiscalYear,
      baseAmount: 0,
      bonusAmount: Math.round(row.bonusWithholding),
      payRunType: PayrollRunType.BONUS,
    });
  }

  return allocations;
}

export async function importResidentTaxNotices(options: {
  csvText: string;
  commit?: boolean;
}): Promise<ResidentTaxImportResult[]> {
  const commit = options.commit ?? false;
  const rows = parseResidentTaxCsv(options.csvText);
  if (rows.length === 0) {
    return [];
  }

  const results: ResidentTaxImportResult[] = [];

  for (const row of rows) {
    const employee = await prisma.employee.findUnique({ where: { employeeCode: row.employeeCode } });
    if (!employee) {
      results.push({
        employeeCode: row.employeeCode,
        fiscalYear: row.fiscalYear,
        status: 'PREVIEW',
        allocations: [],
        message: '該当する従業員が見つかりません',
      });
      continue;
    }

    const allocations = buildSchedule(row);

    if (!commit) {
      results.push({
        employeeCode: row.employeeCode,
        fiscalYear: row.fiscalYear,
        status: 'PREVIEW',
        allocations,
      });
      continue;
    }

    const existingNotice = await prisma.residentTaxNotice.findUnique({
      where: {
        employeeId_fiscalYear: {
          employeeId: employee.id,
          fiscalYear: row.fiscalYear,
        },
      },
    });

    const notice = await prisma.residentTaxNotice.upsert({
      where: {
        employeeId_fiscalYear: {
          employeeId: employee.id,
          fiscalYear: row.fiscalYear,
        },
      },
      create: {
        employeeId: employee.id,
        fiscalYear: row.fiscalYear,
        startMonth: row.startMonth ?? 6,
        annualTax: new Prisma.Decimal(row.annualTax),
        bonusWithholding: row.bonusWithholding ? new Prisma.Decimal(row.bonusWithholding) : undefined,
        remarks: row.remarks,
      },
      update: {
        startMonth: row.startMonth ?? 6,
        annualTax: new Prisma.Decimal(row.annualTax),
        bonusWithholding: row.bonusWithholding ? new Prisma.Decimal(row.bonusWithholding) : undefined,
        remarks: row.remarks,
      },
    });

    if (existingNotice) {
      await prisma.residentTaxAllocation.deleteMany({ where: { noticeId: notice.id } });
    }

    await prisma.residentTaxAllocation.createMany({
      data: allocations.map((allocation) => ({
        noticeId: notice.id,
        month: allocation.month,
        year: allocation.year,
        baseAmount: new Prisma.Decimal(allocation.baseAmount),
        bonusAmount: allocation.bonusAmount ? new Prisma.Decimal(allocation.bonusAmount) : undefined,
        payRunType: allocation.payRunType,
      })),
    });

    results.push({
      employeeCode: row.employeeCode,
      fiscalYear: row.fiscalYear,
      status: existingNotice ? 'UPDATED' : 'CREATED',
      noticeId: notice.id,
      allocations,
    });
  }

  return results;
}
