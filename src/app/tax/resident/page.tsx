import ResidentTaxManager from './ResidentTaxManager';

import { prisma } from '@/lib/prisma';

export default async function ResidentTaxPage() {
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
      <h2>住民税 特別徴収スケジュール管理</h2>
      <p>
        住民税決定通知書（特別徴収）を CSV で取り込み、12 か月配賦や賞与併用分のスケジュールを生成・登録できます。
      </p>
      <ResidentTaxManager employees={employees} />
    </section>
  );
}
