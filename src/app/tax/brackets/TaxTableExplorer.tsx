'use client';

import { useEffect, useMemo, useState } from 'react';

type TableType = 'MONTHLY' | 'DAILY' | 'BONUS';

type TaxBracketRow = {
  id: number;
  range: { min: number; max: number | null };
  baseTax: number;
  deduction: number;
  effectiveTax: number;
  appliesToInput: boolean;
  inputTax: number | null;
};

const tableTypeLabels: Record<TableType, string> = {
  MONTHLY: '月額表',
  DAILY: '日額表',
  BONUS: '賞与税率',
};

function formatRange(range: { min: number; max: number | null }): string {
  const min = range.min.toLocaleString();
  const max = range.max != null ? range.max.toLocaleString() : '以上';
  return `${min} 〜 ${max}`;
}

function formatTax(value: number | null): string {
  if (value == null) return '-';
  return `${Math.round(value).toLocaleString()} 円`;
}

export default function TaxTableExplorer() {
  const [tableType, setTableType] = useState<TableType>('MONTHLY');
  const [dependents, setDependents] = useState<number>(0);
  const [grossIncome, setGrossIncome] = useState<number>(300000);
  const [nonTaxable, setNonTaxable] = useState<number>(0);
  const [rows, setRows] = useState<TaxBracketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taxableIncome = useMemo(() => Math.max(0, grossIncome - nonTaxable), [grossIncome, nonTaxable]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          tableType,
          dependents: String(dependents),
          taxableIncome: String(taxableIncome),
        });
        const response = await fetch(`/api/tax/brackets?${params.toString()}`);
        const json = await response.json();
        if (!response.ok) {
          setError(json.message ?? '税額表の取得に失敗しました');
          setRows([]);
          return;
        }
        setRows(json.data);
      } catch (err) {
        console.error(err);
        setError('通信エラーが発生しました');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableType, dependents, taxableIncome]);

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <form className="card" style={{ display: 'grid', gap: '1rem' }}>
        <label>
          表区分
          <select value={tableType} onChange={(event) => setTableType(event.target.value as TableType)}>
            {Object.entries(tableTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          扶養親族等の数
          <input
            type="number"
            min={0}
            max={10}
            value={dependents}
            onChange={(event) => setDependents(Number(event.target.value))}
          />
        </label>

        <label>
          支給総額
          <input
            type="number"
            min={0}
            value={grossIncome}
            onChange={(event) => setGrossIncome(Number(event.target.value))}
            step={1000}
          />
        </label>

        <label>
          非課税手当 (通勤費など)
          <input
            type="number"
            min={0}
            value={nonTaxable}
            onChange={(event) => setNonTaxable(Number(event.target.value))}
            step={1000}
          />
        </label>

        <div>
          <strong>課税対象額:</strong> {taxableIncome.toLocaleString()} 円
        </div>
      </form>

      <div className="card">
        <h3>{tableTypeLabels[tableType]}（扶養 {dependents} 人）</h3>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {loading ? (
          <p>読み込み中…</p>
        ) : rows.length === 0 ? (
          <p>該当する税額表がありません。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>対象範囲</th>
                <th>税額</th>
                <th>控除額</th>
                <th>調整後税額</th>
                <th>入力値に適用</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={row.appliesToInput ? { background: '#fef3c7' } : undefined}>
                  <td>{formatRange(row.range)}</td>
                  <td>{formatTax(row.baseTax)}</td>
                  <td>{formatTax(row.deduction)}</td>
                  <td>{formatTax(row.effectiveTax)}</td>
                  <td>{row.appliesToInput ? formatTax(row.inputTax) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
