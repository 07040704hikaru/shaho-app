import Link from 'next/link';

import { prisma } from '@/lib/prisma';

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    include: {
      socialInsuranceProfile: true,
      taxProfile: true,
      dependents: true,
    },
    orderBy: { employeeCode: 'asc' },
  });

  return (
    <section className="card">
      <header>
        <h2>従業員マスタ</h2>
        <p>社会保険・税計算に必要な基礎情報を一覧表示します。</p>
      </header>

      <table className="table">
        <thead>
          <tr>
            <th>社員番号</th>
            <th>氏名</th>
            <th>標準報酬月額</th>
            <th>扶養家族</th>
            <th>源泉区分</th>
            <th>詳細</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.employeeCode}</td>
              <td>
                {employee.lastName} {employee.firstName}
              </td>
              <td>
                {employee.socialInsuranceProfile?.standardMonthlyRemuneration
                  ? Number(employee.socialInsuranceProfile.standardMonthlyRemuneration).toLocaleString()
                  : '-'}
              </td>
              <td>{employee.dependents.length}</td>
              <td>{employee.taxProfile?.withholdingType ?? '-'}</td>
              <td>
                <Link href={`/employees/${employee.id}`}>確認</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
