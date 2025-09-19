'use client';

import { useState } from 'react';

type EmployeeOption = {
  id: number;
  employeeCode: string;
  lastName: string;
  firstName: string;
};

type Props = {
  employees: EmployeeOption[];
};

type Indicator = {
  type: 'INFO' | 'WARNING' | 'ACTION';
  message: string;
  detail?: string;
};

type Snapshot = {
  year: number;
  month: number;
  totalRemuneration: number;
  fixedComponent: number;
  variableComponent: number;
  label: string;
};

type EvaluationResponse = {
  evaluation: {
    averageRemuneration: number | null;
    recommendedGrade: number | null;
    recommendedStandardRemuneration: number | null;
    currentGrade: number | null;
    currentStandardRemuneration: number | null;
    requiresMonthlyChange: boolean;
    requiresAnnualRecalculation: boolean;
    indicators: Indicator[];
    snapshots: Snapshot[];
  };
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-';
  return `${Math.round(value).toLocaleString()} 円`;
}

export default function StandardRemunerationEvaluator({ employees }: Props) {
  const [employeeId, setEmployeeId] = useState<number>();
  const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [evaluation, setEvaluation] = useState<EvaluationResponse['evaluation'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId) {
      setError('従業員を選択してください');
      return;
    }

    setLoading(true);
    setError(null);
    setEvaluation(null);

    try {
      const payload = {
        employeeId,
        referenceDate: new Date(referenceDate).toISOString(),
      };
      const response = await fetch('/api/standard-remuneration/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.message ?? '判定に失敗しました');
        return;
      }

      setEvaluation(json.data.evaluation);
    } catch (err) {
      console.error(err);
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid" style={{ gap: '2rem' }}>
      <form onSubmit={handleSubmit}>
        <label>
          対象従業員
          <select
            value={employeeId ?? ''}
            onChange={(event) => setEmployeeId(Number(event.target.value))}
            required
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

        <label>
          判定基準月
          <input
            type="month"
            value={referenceDate.slice(0, 7)}
            onChange={(event) => {
              const value = `${event.target.value}-01`;
              setReferenceDate(value);
            }}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? '判定中…' : '判定する'}
        </button>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      </form>

      {evaluation && (
        <div className="card">
          <h3>判定結果</h3>

          <dl>
            <div>
              <dt>平均報酬月額</dt>
              <dd>{formatCurrency(evaluation.averageRemuneration)}</dd>
            </div>
            <div>
              <dt>推奨等級</dt>
              <dd>{evaluation.recommendedGrade ?? '-'}</dd>
            </div>
            <div>
              <dt>推奨標準報酬月額</dt>
              <dd>{formatCurrency(evaluation.recommendedStandardRemuneration)}</dd>
            </div>
            <div>
              <dt>現行等級</dt>
              <dd>{evaluation.currentGrade ?? '-'}</dd>
            </div>
            <div>
              <dt>現行標準報酬月額</dt>
              <dd>{formatCurrency(evaluation.currentStandardRemuneration)}</dd>
            </div>
          </dl>

          <section>
            <h4>判定指標</h4>
            <ul>
              {evaluation.indicators.map((indicator, index) => (
                <li key={index}>
                  <strong>[{indicator.type}]</strong> {indicator.message}
                  {indicator.detail ? ` - ${indicator.detail}` : ''}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4>対象期間の給与明細</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>対象月</th>
                  <th>合計報酬</th>
                  <th>固定的賃金</th>
                  <th>変動賃金</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.snapshots.map((snapshot) => (
                  <tr key={`${snapshot.year}-${snapshot.month}`}>
                    <td>{snapshot.label}</td>
                    <td>{formatCurrency(snapshot.totalRemuneration)}</td>
                    <td>{formatCurrency(snapshot.fixedComponent)}</td>
                    <td>{formatCurrency(snapshot.variableComponent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
