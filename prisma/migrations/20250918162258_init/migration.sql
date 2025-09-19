-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('REGULAR', 'CONTRACT', 'PART_TIME', 'TEMPORARY', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "SocialInsuranceClassification" AS ENUM ('REGULAR', 'SHORT_TIME', 'PART_TIME', 'COVERED_EXEMPT');

-- CreateEnum
CREATE TYPE "PensionCategory" AS ENUM ('CATEGORY_I', 'CATEGORY_II', 'CATEGORY_III');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('HEALTH', 'PENSION', 'NURSING', 'EMPLOYMENT', 'WORKERS');

-- CreateEnum
CREATE TYPE "InsuranceEnrollmentStatus" AS ENUM ('ENROLLED', 'TERMINATED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "WithholdingType" AS ENUM ('BASIC', 'HEAD_OF_HOUSEHOLD', 'DAILY_EMPLOYEE', 'NON_RESIDENT');

-- CreateEnum
CREATE TYPE "ResidentTaxMethod" AS ENUM ('SPECIAL_COLLECTION', 'ORDINARY_COLLECTION', 'NONE');

-- CreateEnum
CREATE TYPE "IncomeTaxTableType" AS ENUM ('MONTHLY', 'DAILY', 'BONUS');

-- CreateEnum
CREATE TYPE "PayrollItemCategory" AS ENUM ('EARNING', 'ALLOWANCE', 'DEDUCTION', 'SOCIAL_INSURANCE', 'TAX', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PayrollRunType" AS ENUM ('REGULAR', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PayrollChangeType" AS ENUM ('MONTHLY_VARIATION', 'STANDARD_REMUNERATION_RECALC', 'TAX_PROFILE_UPDATE', 'PAYROLL_RECALCULATION', 'RATE_TABLE_UPDATE');

-- CreateEnum
CREATE TYPE "AllowanceFrequency" AS ENUM ('MONTHLY', 'PER_PAY_RUN', 'ANNUAL');

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kanaName" TEXT,
    "corporateNumber" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "officeNumber" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "officeId" INTEGER,
    "employeeCode" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastNameKana" TEXT,
    "firstNameKana" TEXT,
    "displayName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender",
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "employmentType" "EmploymentType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSocialInsurance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "insuredClassification" "SocialInsuranceClassification" NOT NULL,
    "pensionCategory" "PensionCategory",
    "standardMonthlyRemuneration" DECIMAL(10,2),
    "standardBonusAmount" DECIMAL(10,2),
    "healthInsuranceGrade" INTEGER,
    "nursingCareApplicable" BOOLEAN NOT NULL DEFAULT false,
    "employmentInsuranceApplicable" BOOLEAN NOT NULL DEFAULT true,
    "workersCompensationClass" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSocialInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTaxProfile" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "withholdingType" "WithholdingType" NOT NULL,
    "dependentsCount" INTEGER NOT NULL DEFAULT 0,
    "hasSpouseExemption" BOOLEAN NOT NULL DEFAULT false,
    "disabilityType" TEXT,
    "widowWidower" BOOLEAN NOT NULL DEFAULT false,
    "singleParent" BOOLEAN NOT NULL DEFAULT false,
    "residentTaxMethod" "ResidentTaxMethod" NOT NULL DEFAULT 'SPECIAL_COLLECTION',
    "memo" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMyNumber" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "lastFourDigits" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMyNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependent" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT,
    "relationship" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "isSocialInsuranceDependent" BOOLEAN NOT NULL DEFAULT false,
    "isTaxDependent" BOOLEAN NOT NULL DEFAULT false,
    "livesTogether" BOOLEAN,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceRate" (
    "id" SERIAL NOT NULL,
    "insuranceType" "InsuranceType" NOT NULL,
    "grade" INTEGER,
    "regionCode" TEXT,
    "businessCategory" TEXT,
    "thresholdLow" DECIMAL(12,2),
    "thresholdHigh" DECIMAL(12,2),
    "employeeRate" DECIMAL(10,6) NOT NULL,
    "employerRate" DECIMAL(10,6) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "InsuranceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTaxBracket" (
    "id" SERIAL NOT NULL,
    "tableType" "IncomeTaxTableType" NOT NULL,
    "dependents" INTEGER NOT NULL DEFAULT 0,
    "lowerBound" INTEGER NOT NULL,
    "upperBound" INTEGER,
    "taxAmount" INTEGER NOT NULL,
    "deduction" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "IncomeTaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItemDefinition" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PayrollItemCategory" NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "socialInsuranceApplicable" BOOLEAN NOT NULL DEFAULT true,
    "employmentInsuranceApplicable" BOOLEAN NOT NULL DEFAULT false,
    "residentTaxApplicable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItemDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAllowance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "AllowanceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "taxableOverride" BOOLEAN,
    "socialInsuranceOverride" BOOLEAN,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDeduction" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "runType" "PayrollRunType" NOT NULL DEFAULT 'REGULAR',
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollCalculation" (
    "id" SERIAL NOT NULL,
    "payrollRunId" INTEGER,
    "employeeId" INTEGER NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "grossPay" DECIMAL(12,2) NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "taxableIncome" DECIMAL(12,2) NOT NULL,
    "socialInsuranceTotal" DECIMAL(12,2) NOT NULL,
    "taxTotal" DECIMAL(12,2) NOT NULL,
    "residentTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employmentInsurance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "workersCompensation" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nursingCare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustmentNotes" TEXT,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollComponent" (
    "id" SERIAL NOT NULL,
    "calculationId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PayrollItemCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "employerPortion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "PayrollComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceEnrollmentHistory" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "insuranceType" "InsuranceType" NOT NULL,
    "status" "InsuranceEnrollmentStatus" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "standardRemuneration" DECIMAL(12,2),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceEnrollmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxWithholdingHistory" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "tableType" "IncomeTaxTableType" NOT NULL,
    "dependents" INTEGER NOT NULL,
    "taxableIncome" DECIMAL(12,2) NOT NULL,
    "taxWithheld" DECIMAL(12,2) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "payrollRunId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxWithholdingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollChangeLog" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "payrollRunId" INTEGER,
    "changeType" "PayrollChangeType" NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyRemunerationSnapshot" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "allowanceTotal" DECIMAL(12,2) NOT NULL,
    "overtimeTotal" DECIMAL(12,2) NOT NULL,
    "taxableIncome" DECIMAL(12,2) NOT NULL,
    "socialInsuranceTotal" DECIMAL(12,2) NOT NULL,
    "standardMonthlyRemuneration" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyRemunerationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusPayment" (
    "id" SERIAL NOT NULL,
    "payrollRunId" INTEGER,
    "employeeId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxableAmount" DECIMAL(12,2) NOT NULL,
    "socialInsuranceRate" DECIMAL(10,6) NOT NULL,
    "withholdingRate" DECIMAL(10,6) NOT NULL,
    "calculatedTax" DECIMAL(12,2) NOT NULL,
    "calculatedInsurance" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportQueueItem" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "reportType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "ReportQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentTaxNotice" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "annualTax" DECIMAL(12,2) NOT NULL,
    "bonusWithholding" DECIMAL(12,2),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentTaxNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentTaxAllocation" (
    "id" SERIAL NOT NULL,
    "noticeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "bonusAmount" DECIMAL(12,2),
    "payRunType" "PayrollRunType" NOT NULL DEFAULT 'REGULAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "ResidentTaxAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_corporateNumber_key" ON "Company"("corporateNumber");

-- CreateIndex
CREATE INDEX "Office_companyId_idx" ON "Office"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_uuid_key" ON "Employee"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_officeId_idx" ON "Employee"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSocialInsurance_employeeId_key" ON "EmployeeSocialInsurance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTaxProfile_employeeId_key" ON "EmployeeTaxProfile"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMyNumber_employeeId_key" ON "EmployeeMyNumber"("employeeId");

-- CreateIndex
CREATE INDEX "Dependent_employeeId_idx" ON "Dependent"("employeeId");

-- CreateIndex
CREATE INDEX "InsuranceRate_insuranceType_effectiveFrom_idx" ON "InsuranceRate"("insuranceType", "effectiveFrom");

-- CreateIndex
CREATE INDEX "InsuranceRate_insuranceType_grade_idx" ON "InsuranceRate"("insuranceType", "grade");

-- CreateIndex
CREATE INDEX "IncomeTaxBracket_tableType_dependents_lowerBound_idx" ON "IncomeTaxBracket"("tableType", "dependents", "lowerBound");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItemDefinition_code_key" ON "PayrollItemDefinition"("code");

-- CreateIndex
CREATE INDEX "EmployeeAllowance_employeeId_idx" ON "EmployeeAllowance"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAllowance_itemId_idx" ON "EmployeeAllowance"("itemId");

-- CreateIndex
CREATE INDEX "EmployeeDeduction_employeeId_idx" ON "EmployeeDeduction"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDeduction_itemId_idx" ON "EmployeeDeduction"("itemId");

-- CreateIndex
CREATE INDEX "PayrollRun_companyId_idx" ON "PayrollRun"("companyId");

-- CreateIndex
CREATE INDEX "PayrollRun_payDate_idx" ON "PayrollRun"("payDate");

-- CreateIndex
CREATE INDEX "PayrollCalculation_employeeId_idx" ON "PayrollCalculation"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollCalculation_payrollRunId_idx" ON "PayrollCalculation"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollComponent_calculationId_idx" ON "PayrollComponent"("calculationId");

-- CreateIndex
CREATE INDEX "PayrollComponent_itemId_idx" ON "PayrollComponent"("itemId");

-- CreateIndex
CREATE INDEX "InsuranceEnrollmentHistory_employeeId_insuranceType_effecti_idx" ON "InsuranceEnrollmentHistory"("employeeId", "insuranceType", "effectiveDate");

-- CreateIndex
CREATE INDEX "TaxWithholdingHistory_employeeId_effectiveDate_idx" ON "TaxWithholdingHistory"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "PayrollChangeLog_employeeId_effectiveDate_idx" ON "PayrollChangeLog"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "MonthlyRemunerationSnapshot_employeeId_year_month_idx" ON "MonthlyRemunerationSnapshot"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyRemunerationSnapshot_employeeId_year_month_key" ON "MonthlyRemunerationSnapshot"("employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "BonusPayment_employeeId_idx" ON "BonusPayment"("employeeId");

-- CreateIndex
CREATE INDEX "ResidentTaxNotice_employeeId_idx" ON "ResidentTaxNotice"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentTaxNotice_employeeId_fiscalYear_key" ON "ResidentTaxNotice"("employeeId", "fiscalYear");

-- CreateIndex
CREATE INDEX "ResidentTaxAllocation_noticeId_idx" ON "ResidentTaxAllocation"("noticeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentTaxAllocation_noticeId_year_month_payRunType_key" ON "ResidentTaxAllocation"("noticeId", "year", "month", "payRunType");

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSocialInsurance" ADD CONSTRAINT "EmployeeSocialInsurance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTaxProfile" ADD CONSTRAINT "EmployeeTaxProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMyNumber" ADD CONSTRAINT "EmployeeMyNumber_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAllowance" ADD CONSTRAINT "EmployeeAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAllowance" ADD CONSTRAINT "EmployeeAllowance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PayrollItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeduction" ADD CONSTRAINT "EmployeeDeduction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeduction" ADD CONSTRAINT "EmployeeDeduction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PayrollItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollComponent" ADD CONSTRAINT "PayrollComponent_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "PayrollCalculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollComponent" ADD CONSTRAINT "PayrollComponent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PayrollItemDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceEnrollmentHistory" ADD CONSTRAINT "InsuranceEnrollmentHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxWithholdingHistory" ADD CONSTRAINT "TaxWithholdingHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxWithholdingHistory" ADD CONSTRAINT "TaxWithholdingHistory_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollChangeLog" ADD CONSTRAINT "PayrollChangeLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollChangeLog" ADD CONSTRAINT "PayrollChangeLog_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyRemunerationSnapshot" ADD CONSTRAINT "MonthlyRemunerationSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPayment" ADD CONSTRAINT "BonusPayment_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPayment" ADD CONSTRAINT "BonusPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportQueueItem" ADD CONSTRAINT "ReportQueueItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentTaxNotice" ADD CONSTRAINT "ResidentTaxNotice_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentTaxAllocation" ADD CONSTRAINT "ResidentTaxAllocation_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "ResidentTaxNotice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
