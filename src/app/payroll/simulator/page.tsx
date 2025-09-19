import SimulatorForm from './SimulatorForm';

import { prisma } from '@/lib/prisma';

export default async function PayrollSimulatorPage() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      lastName: true,
      firstName: true,
    },
    orderBy: { employeeCode: 'asc' },
  });

  return (
    <section className="card">
      <h2>給与シミュレーター</h2>
      <p>対象従業員と支給条件を入力して社会保険料と税額を試算します。</p>
      <SimulatorForm employees={employees} />
    </section>
  );
}
