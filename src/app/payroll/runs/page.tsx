import { prisma } from '@/lib/prisma';

export default async function PayrollRunsPage() {
  const runs = await prisma.payrollRun.findMany({
    include: {
      calculations: {
        include: {
          employee: {
            select: { employeeCode: true, lastName: true, firstName: true },
          },
        },
      },
    },
    orderBy: { payDate: 'desc' },
  });

  return (
    <section className="card">
      <h2>給与計算履歴</h2>
      <p>過去の給与計算実行と最終的な社会保険料・税額控除結果を確認します。</p>

      {runs.length === 0 ? (
        <p>まだ計算結果がありません。</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>支給日</th>
              <th>期間</th>
              <th>区分</th>
              <th>対象人数</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>{run.payDate.toISOString().slice(0, 10)}</td>
                <td>
                  {run.periodStart.toISOString().slice(0, 10)} 〜 {run.periodEnd.toISOString().slice(0, 10)}
                </td>
                <td>{run.runType}</td>
                <td>{run.calculations.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
