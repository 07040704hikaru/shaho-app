import StandardRemunerationEvaluator from './StandardRemunerationEvaluator';

import { prisma } from '@/lib/prisma';

export default async function StandardRemunerationPage() {
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
      <h2>標準報酬月額の判定</h2>
      <p>直近3か月の給与スナップショットを基に、月額変更届・算定基礎届の判定条件を確認できます。</p>
      <StandardRemunerationEvaluator employees={employees} />
    </section>
  );
}
