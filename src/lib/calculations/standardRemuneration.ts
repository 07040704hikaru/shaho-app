import { addMonths, format } from 'date-fns';

import { prisma } from '@/lib/prisma';
import {
  Employee,
  EmployeeSocialInsurance,
  InsuranceRate,
  InsuranceType,
  MonthlyRemunerationSnapshot,
} from '@prisma/client';

export type SnapshotWithComputed = MonthlyRemunerationSnapshot & {
  totalRemuneration: number;
  fixedComponent: number;
  variableComponent: number;
  label: string;
};

export type StandardRemunerationIndicator = {
  type: 'INFO' | 'WARNING' | 'ACTION';
  message: string;
  detail?: string;
};

export type StandardRemunerationEvaluation = {
  employeeId: number;
  targetYear: number;
  targetMonth: number;
  averageRemuneration: number | null;
  recommendedGrade: number | null;
  recommendedStandardRemuneration: number | null;
  currentGrade: number | null;
  currentStandardRemuneration: number | null;
  requiresMonthlyChange: boolean;
  requiresAnnualRecalculation: boolean;
  indicators: StandardRemunerationIndicator[];
  snapshots: SnapshotWithComputed[];
};

function computeSnapshotAmounts(snapshot: MonthlyRemunerationSnapshot): SnapshotWithComputed {
  const fixedComponent = Number(snapshot.baseSalary ?? 0) + Number(snapshot.allowanceTotal ?? 0);
  const variableComponent = Number(snapshot.overtimeTotal ?? 0);
  const totalRemuneration =
    snapshot.standardMonthlyRemuneration != null
      ? Number(snapshot.standardMonthlyRemuneration)
      : fixedComponent + variableComponent;

  return {
    ...snapshot,
    fixedComponent,
    variableComponent,
    totalRemuneration,
    label: `${snapshot.year}年${snapshot.month}月`,
  };
}

async function fetchEmployeeWithInsuranceProfile(employeeId: number): Promise<
  | (Employee & {
      socialInsuranceProfile: EmployeeSocialInsurance | null;
    })
  | null
> {
  return prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      socialInsuranceProfile: true,
    },
  });
}

async function resolveHealthInsuranceGrade(
  remuneration: number,
  referenceDate: Date,
): Promise<Pick<InsuranceRate, 'grade' | 'thresholdLow' | 'thresholdHigh'> | null> {
  if (!remuneration) {
    return null;
  }

  const rate = await prisma.insuranceRate.findFirst({
    where: {
      insuranceType: InsuranceType.HEALTH,
      effectiveFrom: { lte: referenceDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: referenceDate } }],
      AND: [
        {
          OR: [
            { thresholdLow: null },
            {
              AND: [
                { thresholdLow: { lte: remuneration } },
                { OR: [{ thresholdHigh: null }, { thresholdHigh: { gte: remuneration } }] },
              ],
            },
          ],
        },
      ],
    },
    orderBy: [
      { grade: 'asc' },
      { thresholdLow: 'asc' },
    ],
  });

  if (!rate) {
    return null;
  }

  return {
    grade: rate.grade ?? null,
    thresholdLow: rate.thresholdLow ?? null,
    thresholdHigh: rate.thresholdHigh ?? null,
  };
}

function buildMonthList(target: Date, months: number): Date[] {
  const list: Date[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    list.push(addMonths(target, -i));
  }
  return list;
}

export async function evaluateStandardRemuneration(options: {
  employeeId: number;
  referenceDate: Date;
}): Promise<StandardRemunerationEvaluation> {
  const { employeeId, referenceDate } = options;
  const employee = await fetchEmployeeWithInsuranceProfile(employeeId);

  if (!employee) {
    throw new Error(`Employee ${employeeId} not found`);
  }

  const currentProfile = employee.socialInsuranceProfile;
  const targetYear = referenceDate.getFullYear();
  const targetMonth = referenceDate.getMonth() + 1;

  const monthsForAverage = buildMonthList(referenceDate, 3);

  const snapshotsRaw = await prisma.monthlyRemunerationSnapshot.findMany({
    where: {
      employeeId,
      OR: monthsForAverage.map((monthDate) => ({
        year: monthDate.getFullYear(),
        month: monthDate.getMonth() + 1,
      })),
    },
    orderBy: [
      { year: 'asc' },
      { month: 'asc' },
    ],
  });

  const snapshotMap = new Map<string, SnapshotWithComputed>();
  snapshotsRaw.forEach((snapshot) => {
    const computed = computeSnapshotAmounts(snapshot);
    snapshotMap.set(`${snapshot.year}-${snapshot.month}`, computed);
  });

  const orderedSnapshots = monthsForAverage
    .map((date) => snapshotMap.get(`${date.getFullYear()}-${date.getMonth() + 1}`))
    .filter((snapshot): snapshot is SnapshotWithComputed => Boolean(snapshot));

  const indicators: StandardRemunerationIndicator[] = [];

  if (orderedSnapshots.length < 3) {
    indicators.push({
      type: 'WARNING',
      message: '算定対象月の給与データが不足しています',
      detail: '直近3か月分の標準報酬スナップショットを登録してください。',
    });
  }

  const averageRemuneration =
    orderedSnapshots.length > 0
      ? orderedSnapshots.reduce((sum, snapshot) => sum + snapshot.totalRemuneration, 0) /
        orderedSnapshots.length
      : null;

  let recommendedGrade: number | null = null;
  let recommendedStandardRemuneration: number | null = null;

  if (averageRemuneration != null) {
    const gradeInfo = await resolveHealthInsuranceGrade(averageRemuneration, referenceDate);
    if (gradeInfo?.grade != null) {
      recommendedGrade = gradeInfo.grade;
      const lower = gradeInfo.thresholdLow ? Number(gradeInfo.thresholdLow) : averageRemuneration;
      const upper = gradeInfo.thresholdHigh ? Number(gradeInfo.thresholdHigh) : averageRemuneration;
      recommendedStandardRemuneration = Math.round((lower + upper) / 2);
    }
  }

  const currentGrade = currentProfile?.healthInsuranceGrade ?? null;
  const currentStandardRemuneration = currentProfile?.standardMonthlyRemuneration
    ? Number(currentProfile.standardMonthlyRemuneration)
    : null;

  let requiresMonthlyChange = false;
  let requiresAnnualRecalculation = false;

  if (recommendedGrade != null && currentGrade != null) {
    const gradeGap = Math.abs(recommendedGrade - currentGrade);
    if (gradeGap >= 2) {
      requiresMonthlyChange = true;
      indicators.push({
        type: 'ACTION',
        message: '月額変更届の提出基準を超えています',
        detail: `現等級: ${currentGrade} → 推奨等級: ${recommendedGrade} (差 ${gradeGap} 等級)`,
      });
    } else {
      indicators.push({
        type: 'INFO',
        message: '月額変更届の提出基準未満です',
        detail: `現等級と推奨等級の差: ${gradeGap} 等級`,
      });
    }
  }

  if (targetMonth === 7) {
    // July calculation (算定基礎届対象). Using Apr-Jun snapshots (already covered by orderedSnapshots when reference is July).
    if (recommendedGrade != null && currentGrade != null && recommendedGrade !== currentGrade) {
      requiresAnnualRecalculation = true;
      indicators.push({
        type: 'ACTION',
        message: '算定基礎届で標準報酬月額を改定する必要があります',
        detail: `現等級: ${currentGrade} → 推奨等級: ${recommendedGrade}`,
      });
    } else {
      indicators.push({
        type: 'INFO',
        message: '算定基礎届：現行等級と推奨等級に差異はありません',
      });
    }
  }

  if (!requiresMonthlyChange && !requiresAnnualRecalculation && currentProfile) {
    indicators.push({
      type: 'INFO',
      message: '現行標準報酬月額を維持できます',
      detail: currentStandardRemuneration
        ? `現行標準報酬月額: ${currentStandardRemuneration.toLocaleString()} 円`
        : undefined,
    });
  }

  if (orderedSnapshots.length === 0) {
    indicators.push({
      type: 'WARNING',
      message: '平均算出のためのスナップショットが見つかりません',
    });
  }

  return {
    employeeId,
    targetYear,
    targetMonth,
    averageRemuneration: averageRemuneration != null ? Math.round(averageRemuneration) : null,
    recommendedGrade,
    recommendedStandardRemuneration,
    currentGrade,
    currentStandardRemuneration,
    requiresMonthlyChange,
    requiresAnnualRecalculation,
    indicators,
    snapshots: orderedSnapshots,
  };
}

export type MonthlyRemunerationReport = {
  employeeId: number;
  reference: string;
  evaluation: StandardRemunerationEvaluation;
};

export async function buildStandardRemunerationReport(options: {
  employeeId: number;
  referenceDate: Date;
}): Promise<MonthlyRemunerationReport> {
  const evaluation = await evaluateStandardRemuneration(options);
  return {
    employeeId: options.employeeId,
    reference: format(options.referenceDate, 'yyyy-MM'),
    evaluation,
  };
}
