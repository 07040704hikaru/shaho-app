import Link from 'next/link';

export default function Home() {
  return (
    <section className="card">
      <h1>社会保険・税統合ダッシュボード</h1>
      <p>
        従業員の資格情報を管理し、健康保険・厚生年金・雇用保険などの料率を基に給与控除をシミュレートする Next.js +
        Prisma アプリケーションです。
      </p>
      <ul>
        <li>
          <Link href="/employees">従業員マスタ管理</Link>
        </li>
        <li>
          <Link href="/payroll/simulator">給与シミュレーター</Link>
        </li>
        <li>
          <Link href="/payroll/runs">計算履歴</Link>
        </li>
        <li>
          <Link href="/insurance/standard-remuneration">標準報酬月額 判定ツール</Link>
        </li>
        <li>
          <Link href="/tax/brackets">源泉税額表ビューア</Link>
        </li>
        <li>
          <Link href="/tax/resident">住民税特別徴収スケジューラ</Link>
        </li>
      </ul>
    </section>
  );
}
