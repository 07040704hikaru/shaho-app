import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';

interface Props {
  params: { id: string };
}

export default async function EmployeeDetailPage({ params }: Props) {
  const employeeId = Number(params.id);
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      socialInsuranceProfile: true,
      taxProfile: true,
      dependents: true,
      insuranceHistories: true,
      taxHistories: true,
    },
  });

  if (!employee) {
    notFound();
  }

  return (
    <div className="card">
      <h2>
        {employee.lastName} {employee.firstName}
      </h2>
      <p>社員番号: {employee.employeeCode}</p>

      <section>
        <h3>社会保険情報</h3>
        <ul>
          <li>種別: {employee.socialInsuranceProfile?.insuredClassification ?? '-'}</li>
          <li>
            標準報酬月額:{' '}
            {employee.socialInsuranceProfile?.standardMonthlyRemuneration
              ? Number(employee.socialInsuranceProfile.standardMonthlyRemuneration).toLocaleString()
              : '-'}
          </li>
          <li>
            健康保険等級: {employee.socialInsuranceProfile?.healthInsuranceGrade ?? '-'}
          </li>
          <li>介護保険対象: {employee.socialInsuranceProfile?.nursingCareApplicable ? '対象' : '対象外'}</li>
        </ul>
      </section>

      <section>
        <h3>税情報</h3>
        <ul>
          <li>源泉区分: {employee.taxProfile?.withholdingType ?? '-'}</li>
          <li>扶養人数: {employee.taxProfile?.dependentsCount ?? 0}</li>
          <li>住民税方式: {employee.taxProfile?.residentTaxMethod ?? '-'}</li>
        </ul>
      </section>

      <section>
        <h3>扶養家族</h3>
        <ul>
          {employee.dependents.map((dependent) => (
            <li key={dependent.id}>
              {dependent.name} / {dependent.relationship} / {dependent.isTaxDependent ? '税扶養' : '—'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>資格取得・喪失履歴</h3>
        <ul>
          {employee.insuranceHistories.map((history) => (
            <li key={history.id}>
              {history.effectiveDate.toISOString().slice(0, 10)} {history.insuranceType} {history.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
