import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.reportQueueItem.deleteMany();
  await prisma.residentTaxAllocation.deleteMany();
  await prisma.residentTaxNotice.deleteMany();
  await prisma.payrollComponent.deleteMany();
  await prisma.payrollCalculation.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.employeeAllowance.deleteMany();
  await prisma.employeeDeduction.deleteMany();
  await prisma.dependent.deleteMany();
  await prisma.employeeSocialInsurance.deleteMany();
  await prisma.employeeTaxProfile.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.office.deleteMany();
  await prisma.company.deleteMany();
  await prisma.insuranceRate.deleteMany();
  await prisma.incomeTaxBracket.deleteMany();
  await prisma.payrollItemDefinition.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: '社会保険ソリューションズ株式会社',
      kanaName: 'シャカイホケンソリューションズ',
      corporateNumber: '1234567890123',
      postalCode: '1000001',
      address: '東京都千代田区千代田1-1',
    },
  });

  const hq = await prisma.office.create({
    data: {
      companyId: company.id,
      name: '本社',
      officeNumber: '1300-000001-0',
      postalCode: '1000001',
      address: '東京都千代田区千代田1-1',
    },
  });

  await prisma.payrollItemDefinition.createMany({
    data: [
      {
        code: 'BASE_SALARY',
        name: '基本給',
        category: 'EARNING',
        taxable: true,
        socialInsuranceApplicable: true,
        employmentInsuranceApplicable: true,
      },
      {
        code: 'COMMUTE_ALLOWANCE',
        name: '通勤手当',
        category: 'ALLOWANCE',
        taxable: false,
        socialInsuranceApplicable: false,
        employmentInsuranceApplicable: false,
      },
      {
        code: 'HOUSING_ALLOWANCE',
        name: '住宅手当',
        category: 'ALLOWANCE',
        taxable: true,
        socialInsuranceApplicable: true,
      },
      {
        code: 'INCOME_TAX',
        name: '源泉所得税',
        category: 'TAX',
        taxable: false,
        socialInsuranceApplicable: false,
      },
      {
        code: 'RESIDENT_TAX',
        name: '住民税',
        category: 'TAX',
        taxable: false,
        socialInsuranceApplicable: false,
      },
    ],
  });

  const insuranceRates = [
    {
      insuranceType: 'HEALTH',
      grade: 20,
      thresholdLow: new Prisma.Decimal(290000),
      thresholdHigh: new Prisma.Decimal(310000),
      employeeRate: new Prisma.Decimal(0.0495),
      employerRate: new Prisma.Decimal(0.0495),
      effectiveFrom: new Date('2024-03-01'),
    },
    {
      insuranceType: 'PENSION',
      grade: 20,
      thresholdLow: new Prisma.Decimal(290000),
      thresholdHigh: new Prisma.Decimal(310000),
      employeeRate: new Prisma.Decimal(0.0915),
      employerRate: new Prisma.Decimal(0.0915),
      effectiveFrom: new Date('2024-03-01'),
    },
    {
      insuranceType: 'NURSING',
      employeeRate: new Prisma.Decimal(0.004),
      employerRate: new Prisma.Decimal(0.004),
      effectiveFrom: new Date('2024-03-01'),
    },
    {
      insuranceType: 'EMPLOYMENT',
      employeeRate: new Prisma.Decimal(0.003),
      employerRate: new Prisma.Decimal(0.006),
      effectiveFrom: new Date('2024-04-01'),
    },
    {
      insuranceType: 'WORKERS',
      businessCategory: 'IT_SERVICES',
      employeeRate: new Prisma.Decimal(0),
      employerRate: new Prisma.Decimal(0.0025),
      effectiveFrom: new Date('2024-04-01'),
    },
  ] satisfies Prisma.InsuranceRateCreateManyInput[];

  await prisma.insuranceRate.createMany({ data: insuranceRates });

  const taxBrackets = [
    {
      tableType: 'MONTHLY',
      dependents: 0,
      lowerBound: 0,
      upperBound: 304999,
      taxAmount: 0,
      deduction: 0,
      effectiveFrom: new Date('2023-01-01'),
    },
    {
      tableType: 'MONTHLY',
      dependents: 0,
      lowerBound: 305000,
      upperBound: 349999,
      taxAmount: 1530,
      deduction: 0,
      effectiveFrom: new Date('2023-01-01'),
    },
    {
      tableType: 'MONTHLY',
      dependents: 1,
      lowerBound: 305000,
      upperBound: 349999,
      taxAmount: 630,
      deduction: 0,
      effectiveFrom: new Date('2023-01-01'),
    },
    {
      tableType: 'BONUS',
      dependents: 0,
      lowerBound: 0,
      upperBound: 1000000,
      taxAmount: 0.102 * 1000000,
      deduction: 0,
      effectiveFrom: new Date('2023-01-01'),
    },
  ] satisfies Prisma.IncomeTaxBracketCreateManyInput[];

  await prisma.incomeTaxBracket.createMany({ data: taxBrackets });

  const employee = await prisma.employee.create({
    data: {
      companyId: company.id,
      officeId: hq.id,
      employeeCode: 'E001',
      lastName: '山田',
      firstName: '太郎',
      lastNameKana: 'ヤマダ',
      firstNameKana: 'タロウ',
      displayName: '山田 太郎',
      dateOfBirth: new Date('1990-04-01'),
      gender: 'MALE',
      hireDate: new Date('2020-04-01'),
      employmentType: 'REGULAR',
      email: 'taro.yamada@example.com',
      phone: '050-1234-5678',
      postalCode: '1000001',
      address: '東京都千代田区千代田1-1',
      socialInsuranceProfile: {
        create: {
          insuredClassification: 'REGULAR',
          pensionCategory: 'CATEGORY_II',
          standardMonthlyRemuneration: new Prisma.Decimal(300000),
          healthInsuranceGrade: 20,
          nursingCareApplicable: true,
          employmentInsuranceApplicable: true,
          workersCompensationClass: 'IT_SERVICES',
          effectiveFrom: new Date('2020-04-01'),
        },
      },
      taxProfile: {
        create: {
          withholdingType: 'BASIC',
          dependentsCount: 1,
          hasSpouseExemption: false,
          residentTaxMethod: 'SPECIAL_COLLECTION',
          effectiveFrom: new Date('2020-04-01'),
        },
      },
      dependents: {
        create: [
          {
            name: '山田 花子',
            relationship: '配偶者',
            dateOfBirth: new Date('1992-08-10'),
            isSocialInsuranceDependent: true,
            isTaxDependent: true,
            livesTogether: true,
            startDate: new Date('2020-04-01'),
          },
          {
            name: '山田 次郎',
            relationship: '子',
            dateOfBirth: new Date('2021-06-15'),
            isSocialInsuranceDependent: true,
            isTaxDependent: true,
            livesTogether: true,
            startDate: new Date('2021-06-15'),
          },
        ],
      },
      insuranceHistories: {
        create: [
          {
            insuranceType: 'HEALTH',
            status: 'ENROLLED',
            effectiveDate: new Date('2020-04-01'),
            standardRemuneration: new Prisma.Decimal(300000),
          },
          {
            insuranceType: 'PENSION',
            status: 'ENROLLED',
            effectiveDate: new Date('2020-04-01'),
            standardRemuneration: new Prisma.Decimal(300000),
          },
        ],
      },
    },
    include: {
      socialInsuranceProfile: true,
      taxProfile: true,
    },
  });

  const commuteItemId = await getItemId('COMMUTE_ALLOWANCE');
  const housingItemId = await getItemId('HOUSING_ALLOWANCE');

  await prisma.employeeAllowance.createMany({
    data: [
      {
        employeeId: employee.id,
        itemId: commuteItemId,
        amount: new Prisma.Decimal(20000),
        frequency: 'MONTHLY',
        taxableOverride: false,
        socialInsuranceOverride: false,
        startDate: new Date('2020-04-01'),
      },
      {
        employeeId: employee.id,
        itemId: housingItemId,
        amount: new Prisma.Decimal(30000),
        frequency: 'MONTHLY',
        startDate: new Date('2020-04-01'),
      },
    ],
  });

  await prisma.taxWithholdingHistory.create({
    data: {
      employeeId: employee.id,
      tableType: 'MONTHLY',
      dependents: 1,
      taxableIncome: new Prisma.Decimal(300000),
      taxWithheld: new Prisma.Decimal(8000),
      effectiveDate: new Date('2024-04-01'),
    },
  });

  await prisma.monthlyRemunerationSnapshot.createMany({
    data: [
      {
        employeeId: employee.id,
        year: 2024,
        month: 4,
        totalDays: 20,
        totalHours: new Prisma.Decimal(160),
        baseSalary: new Prisma.Decimal(300000),
        allowanceTotal: new Prisma.Decimal(50000),
        overtimeTotal: new Prisma.Decimal(10000),
        taxableIncome: new Prisma.Decimal(360000),
        socialInsuranceTotal: new Prisma.Decimal(60000),
        standardMonthlyRemuneration: new Prisma.Decimal(350000),
      },
      {
        employeeId: employee.id,
        year: 2024,
        month: 5,
        totalDays: 20,
        totalHours: new Prisma.Decimal(160),
        baseSalary: new Prisma.Decimal(300000),
        allowanceTotal: new Prisma.Decimal(50000),
        overtimeTotal: new Prisma.Decimal(12000),
        taxableIncome: new Prisma.Decimal(362000),
        socialInsuranceTotal: new Prisma.Decimal(60000),
        standardMonthlyRemuneration: new Prisma.Decimal(350000),
      },
      {
        employeeId: employee.id,
        year: 2024,
        month: 6,
        totalDays: 20,
        totalHours: new Prisma.Decimal(160),
        baseSalary: new Prisma.Decimal(300000),
        allowanceTotal: new Prisma.Decimal(50000),
        overtimeTotal: new Prisma.Decimal(8000),
        taxableIncome: new Prisma.Decimal(358000),
        socialInsuranceTotal: new Prisma.Decimal(60000),
        standardMonthlyRemuneration: new Prisma.Decimal(350000),
      },
    ],
  });

  const residentNotice = await prisma.residentTaxNotice.create({
    data: {
      employeeId: employee.id,
      fiscalYear: 2024,
      startMonth: 6,
      annualTax: new Prisma.Decimal(96000),
      bonusWithholding: new Prisma.Decimal(20000),
      remarks: 'サンプルデータ',
    },
  });

  await prisma.employeePayrollMaster.create({
    data: {
      employeeId: employee.id,
      baseSalary: new Prisma.Decimal(300000),
      overtimeDivisor: 160,
      overtimeMultiplier: new Prisma.Decimal(1.25),
      socialInsuranceProfileId: employee.socialInsuranceProfile?.id,
      taxProfileId: employee.taxProfile?.id,
      residentTaxNoticeId: residentNotice.id,
    },
  });

  const monthlyShare = 96000 - 20000;
  const monthlyAmount = Math.floor(monthlyShare / 12);
  const remainder = monthlyShare - monthlyAmount * 12;

  for (let i = 0; i < 12; i += 1) {
    const month = ((6 - 1 + i) % 12) + 1;
    const yearOffset = month >= 6 ? 0 : 1;
    const extra = i < remainder ? 1 : 0;
    await prisma.residentTaxAllocation.create({
      data: {
        noticeId: residentNotice.id,
        month,
        year: 2024 + yearOffset,
        baseAmount: new Prisma.Decimal(monthlyAmount + extra),
        payRunType: 'REGULAR',
      },
    });
  }

  await prisma.residentTaxAllocation.create({
    data: {
      noticeId: residentNotice.id,
      month: 6,
      year: 2024,
      baseAmount: new Prisma.Decimal(0),
      bonusAmount: new Prisma.Decimal(20000),
      payRunType: 'BONUS',
    },
  });

  console.log('Seed completed');
}

async function getItemId(code: string) {
  const item = await prisma.payrollItemDefinition.findUnique({ where: { code } });
  if (!item) throw new Error(`PayrollItemDefinition ${code} not found`);
  return item.id;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
