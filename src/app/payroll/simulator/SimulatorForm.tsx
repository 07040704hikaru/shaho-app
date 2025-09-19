'use client';

import { useMemo, useState } from 'react';

interface EmployeeOption {
  id: number;
  employeeCode: string;
  lastName: string;
  firstName: string;
}

interface Props {
  employees: EmployeeOption[];
}

interface AllowanceDraft {
  itemCode: string;
  amount: number;
}

interface DeductionDraft {
  itemCode: string;
  amount: number;
}

export default function SimulatorForm({ employees }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<number | undefined>();
  const [baseSalary, setBaseSalary] = useState<number>(300000);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [allowances, setAllowances] = useState<AllowanceDraft[]>([]);
  const [deductions, setDeductions] = useState<DeductionDraft[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEmployee) {
      setError('従業員を選択してください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        employeeId: selectedEmployee,
        payrollDate: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        baseSalary,
        overtimeHours,
        allowances,
        deductions,
        bonusAmount,
      };

      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? '計算に失敗しました');
      } else {
        setResult(data.data);
      }
    } catch (err) {
      console.error(err);
      setError('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const addAllowance = () => setAllowances((prev) => [...prev, { itemCode: '', amount: 0 }]);
  const addDeduction = () => setDeductions((prev) => [...prev, { itemCode: '', amount: 0 }]);

  return (
    <div className="grid" style={{ gap: '2rem' }}>
      <form onSubmit={handleSubmit}>
        <label>
          従業員
          <select
            value={selectedEmployee ?? ''}
            onChange={(event) => setSelectedEmployee(Number(event.target.value))}
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
          支給月
          <input type="date" defaultValue={today} disabled />
        </label>

        <label>
          基本給
          <input
            type="number"
            value={baseSalary}
            onChange={(event) => setBaseSalary(Number(event.target.value))}
            min={0}
            step={1}
          />
        </label>

        <label>
          時間外労働時間
          <input
            type="number"
            value={overtimeHours}
            onChange={(event) => setOvertimeHours(Number(event.target.value))}
            min={0}
            step={0.25}
          />
        </label>

        <label>
          賞与額
          <input
            type="number"
            value={bonusAmount}
            onChange={(event) => setBonusAmount(Number(event.target.value))}
            min={0}
            step={1000}
          />
        </label>

        <section>
          <h3>手当</h3>
          {allowances.map((allowance, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                placeholder="ITEM_CODE"
                value={allowance.itemCode}
                onChange={(event) => {
                  const value = event.target.value;
                  setAllowances((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], itemCode: value };
                    return next;
                  });
                }}
              />
              <input
                type="number"
                value={allowance.amount}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setAllowances((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], amount: value };
                    return next;
                  });
                }}
                min={0}
                step={100}
              />
            </div>
          ))}
          <button type="button" className="button-secondary" onClick={addAllowance}>
            手当を追加
          </button>
        </section>

        <section>
          <h3>控除</h3>
          {deductions.map((deduction, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                placeholder="ITEM_CODE"
                value={deduction.itemCode}
                onChange={(event) => {
                  const value = event.target.value;
                  setDeductions((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], itemCode: value };
                    return next;
                  });
                }}
              />
              <input
                type="number"
                value={deduction.amount}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDeductions((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], amount: value };
                    return next;
                  });
                }}
                min={0}
                step={100}
              />
            </div>
          ))}
          <button type="button" className="button-secondary" onClick={addDeduction}>
            控除を追加
          </button>
        </section>

        <button type="submit" disabled={loading}>
          {loading ? '計算中…' : '計算する'}
        </button>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      </form>

      {result && (
        <aside className="card">
          <h3>結果</h3>
          <dl>
            <div>
              <dt>総支給</dt>
              <dd>{Math.round(result.grossPay).toLocaleString()} 円</dd>
            </div>
            <div>
              <dt>社会保険料</dt>
              <dd>
                {result.socialInsurance.reduce(
                  (total: number, current: any) => total + current.employeePortion,
                  0,
                ).toLocaleString()}{' '}
                円
              </dd>
            </div>
            <div>
              <dt>源泉所得税</dt>
              <dd>{Math.round(result.incomeTax).toLocaleString()} 円</dd>
            </div>
            <div>
              <dt>住民税</dt>
              <dd>{Math.round(result.residentTax).toLocaleString()} 円</dd>
            </div>
            <div>
              <dt>差引支給額</dt>
              <dd>{Math.round(result.netPay).toLocaleString()} 円</dd>
            </div>
          </dl>

          <h4>内訳</h4>
          <table className="table">
            <thead>
              <tr>
                <th>コード</th>
                <th>名称</th>
                <th>区分</th>
                <th>本人</th>
                <th>会社</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((item: any) => (
                <tr key={item.code}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{Math.round(item.employeePortion).toLocaleString()}</td>
                  <td>{item.employerPortion ? Math.round(item.employerPortion).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      )}
    </div>
  );
}
