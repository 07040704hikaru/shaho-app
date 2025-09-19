'use client';

import { useEffect, useMemo, useState } from 'react';

type EmployeeOption = {
  id: number;
  employeeCode: string;
  lastName: string;
  firstName: string;
};

type Props = {
  employees: EmployeeOption[];
};

type Allocation = {
  id?: number;
  month: number;
  year: number;
  baseAmount: string;
  bonusAmount?: string | null;
  payRunType: 'REGULAR' | 'BONUS' | 'ADJUSTMENT';
};

type Notice = {
  id: number;
  fiscalYear: number;
  startMonth: number;
  annualTax: string;
  bonusWithholding?: string | null;
  remarks?: string | null;
  allocations: Allocation[];
};

type ImportResult = {
  employeeCode: string;
  fiscalYear: number;
  status: 'PREVIEW' | 'CREATED' | 'UPDATED';
  noticeId?: number;
  message?: string;
  allocations: Array<{
    month: number;
    year: number;
    baseAmount: number;
    bonusAmount?: number;
    payRunType: string;
  }>;
};

const sampleCsv = `employeeCode,fiscalYear,annualTax,bonusWithholding,startMonth,remarks
E001,2024,96000,20000,6,前年より扶養増加
`;

function formatAmount(value?: string | number | null): string {
  if (value == null) return '-';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '-';
  return `${Math.round(numeric).toLocaleString()} 円`;
}

export default function ResidentTaxManager({ employees }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [csvText, setCsvText] = useState<string>(sampleCsv);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  useEffect(() => {
    const fetchNotices = async () => {
      if (!selectedEmployeeId) {
        setNotices([]);
        return;
      }
      try {
        const params = new URLSearchParams({ employeeId: String(selectedEmployeeId) });
        const response = await fetch(`/api/resident-tax/notice?${params.toString()}`);
        const json = await response.json();
        if (!response.ok) {
          setError(json.message ?? '住民税データの取得に失敗しました');
          setNotices([]);
          return;
        }
        setError(null);
        setNotices(json.data);
      } catch (err) {
        console.error(err);
        setError('通信エラーが発生しました');
        setNotices([]);
      }
    };

    fetchNotices();
  }, [selectedEmployeeId]);

  const handleImport = async (commit: boolean) => {
    setLoading(true);
    setError(null);
    setImportResults([]);
    try {
      const response = await fetch('/api/resident-tax/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, commit }),
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.message ?? 'インポートに失敗しました');
        return;
      }
      setImportResults(json.data);

      if (commit && selectedEmployee) {
        // refresh notices for selected employee if affected
        const hasEmployee = json.data.some((result: ImportResult) => result.employeeCode === selectedEmployee.employeeCode);
        if (hasEmployee) {
          const params = new URLSearchParams({ employeeId: String(selectedEmployee.id) });
          const refresh = await fetch(`/api/resident-tax/notice?${params.toString()}`);
          const refreshJson = await refresh.json();
          if (refresh.ok) {
            setNotices(refreshJson.data);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid" style={{ gap: '2rem' }}>
      <section className="card" style={{ display: 'grid', gap: '1rem' }}>
        <h3>住民税決定通知書の取り込み</h3>

        <p>
          CSV のヘッダーには <code>employeeCode, fiscalYear, annualTax, bonusWithholding, startMonth, remarks</code> を指定してください。
        </p>

        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          rows={6}
          style={{ fontFamily: 'monospace', width: '100%' }}
        />

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="button-secondary" onClick={() => handleImport(false)} disabled={loading}>
            プレビュー
          </button>
          <button type="button" onClick={() => handleImport(true)} disabled={loading}>
            登録する
          </button>
        </div>

        {loading && <p>処理中です…</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        {importResults.length > 0 && (
          <section>
            <h4>インポート結果</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>社員コード</th>
                  <th>年度</th>
                  <th>ステータス</th>
                  <th>コメント</th>
                </tr>
              </thead>
              <tbody>
                {importResults.map((result, index) => (
                  <tr key={index}>
                    <td>{result.employeeCode}</td>
                    <td>{result.fiscalYear}</td>
                    <td>{result.status}</td>
                    <td>{result.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <details>
              <summary>配賦プレビュー</summary>
              {importResults.map((result, index) => (
                <div key={index} style={{ marginTop: '1rem' }}>
                  <strong>
                    {result.employeeCode} / {result.fiscalYear} 年度
                  </strong>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>年</th>
                        <th>月</th>
                        <th>定例分</th>
                        <th>賞与分</th>
                        <th>区分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocations.map((allocation, idx) => (
                        <tr key={idx}>
                          <td>{allocation.year}</td>
                          <td>{allocation.month}</td>
                          <td>{formatAmount(allocation.baseAmount)}</td>
                          <td>{formatAmount(allocation.bonusAmount)}</td>
                          <td>{allocation.payRunType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </details>
          </section>
        )}
      </section>

      <section className="card" style={{ display: 'grid', gap: '1rem' }}>
        <h3>登録済みスケジュール</h3>

        <label>
          従業員を選択
          <select
            value={selectedEmployeeId ?? ''}
            onChange={(event) => setSelectedEmployeeId(Number(event.target.value))}
          >
            <option value="" disabled>
              選択してください
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employeeCode} {employee.lastName}
                {employee.firstName}
              </option>
            ))}
          </select>
        </label>

        {selectedEmployee && (
          <p>
            {selectedEmployee.employeeCode} {selectedEmployee.lastName}
            {selectedEmployee.firstName} のスケジュール
          </p>
        )}

        {notices.length === 0 ? (
          <p>登録済みスケジュールはありません。</p>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
              <h4>
                {notice.fiscalYear} 年度 / 開始月: {notice.startMonth}月 / 年税額: {formatAmount(notice.annualTax)}
              </h4>
              <p>賞与併用: {formatAmount(notice.bonusWithholding)}</p>
              <table className="table">
                <thead>
                  <tr>
                    <th>年</th>
                    <th>月</th>
                    <th>定例分</th>
                    <th>賞与分</th>
                    <th>区分</th>
                  </tr>
                </thead>
                <tbody>
                  {notice.allocations.map((allocation, index) => (
                    <tr key={index}>
                      <td>{allocation.year}</td>
                      <td>{allocation.month}</td>
                      <td>{formatAmount(allocation.baseAmount)}</td>
                      <td>{formatAmount(allocation.bonusAmount)}</td>
                      <td>{allocation.payRunType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
