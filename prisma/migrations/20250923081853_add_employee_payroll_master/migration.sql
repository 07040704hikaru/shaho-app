-- CreateEnum
CREATE TYPE "PayrollSalaryType" AS ENUM ('MONTHLY', 'HOURLY', 'DAILY');

-- CreateTable
CREATE TABLE "EmployeePayrollMaster" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "salaryType" "PayrollSalaryType" NOT NULL DEFAULT 'MONTHLY',
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "overtimeDivisor" INTEGER,
    "overtimeMultiplier" DECIMAL(5,2),
    "socialInsuranceProfileId" INTEGER,
    "taxProfileId" INTEGER,
    "residentTaxNoticeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayrollMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollMaster_employeeId_key" ON "EmployeePayrollMaster"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollMaster_socialInsuranceProfileId_key" ON "EmployeePayrollMaster"("socialInsuranceProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollMaster_taxProfileId_key" ON "EmployeePayrollMaster"("taxProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollMaster_residentTaxNoticeId_key" ON "EmployeePayrollMaster"("residentTaxNoticeId");

-- AddForeignKey
ALTER TABLE "EmployeePayrollMaster" ADD CONSTRAINT "EmployeePayrollMaster_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollMaster" ADD CONSTRAINT "EmployeePayrollMaster_socialInsuranceProfileId_fkey" FOREIGN KEY ("socialInsuranceProfileId") REFERENCES "EmployeeSocialInsurance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollMaster" ADD CONSTRAINT "EmployeePayrollMaster_taxProfileId_fkey" FOREIGN KEY ("taxProfileId") REFERENCES "EmployeeTaxProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollMaster" ADD CONSTRAINT "EmployeePayrollMaster_residentTaxNoticeId_fkey" FOREIGN KEY ("residentTaxNoticeId") REFERENCES "ResidentTaxNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
