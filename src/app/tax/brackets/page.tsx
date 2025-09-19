import TaxTableExplorer from './TaxTableExplorer';

export default function TaxBracketsPage() {
  return (
    <section className="card">
      <h2>源泉所得税表の適用確認</h2>
      <p>月額表・日額表・賞与税率の範囲と税額控除を確認し、扶養人数や非課税手当の影響をシミュレートします。</p>
      <TaxTableExplorer />
    </section>
  );
}
