"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner } from "@/components/ui";
import { Donut, MonthlyBars } from "@/components/charts";
import { formatMoney } from "@/lib/format";

type Period = "3" | "6" | "12" | "ytd";

export default function ReportsPage() {
  const d = useData();
  const [period, setPeriod] = useState<Period>("6");

  const { start, monthsBack } = useMemo(() => {
    const now = new Date();
    if (period === "ytd") {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: s, monthsBack: now.getMonth() + 1 };
    }
    const n = parseInt(period);
    const s = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
    return { start: s, monthsBack: n };
  }, [period]);

  if (d.loading) return <Spinner />;

  const startISO = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;

  const inRange = (iso: string) => iso >= startISO;

  let income = 0;
  let expense = 0;
  const expByCat: Record<string, number> = {};
  const incByCat: Record<string, number> = {};

  for (const t of d.transactions) {
    if (!inRange(t.txn_date)) continue;
    const base0 = d.toBaseAmount(Number(t.amount), t.currency);
    if (t.type === "income") {
      income += base0;
      const k = t.category_id || "uncat";
      incByCat[k] = (incByCat[k] || 0) + base0;
    } else if (t.type === "expense") {
      expense += -base0;
      const k = t.category_id || "uncat";
      expByCat[k] = (expByCat[k] || 0) + -base0;
    }
  }
  const net = income - expense;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  const segify = (map: Record<string, number>) =>
    Object.entries(map)
      .map(([cid, val]) => {
        const c = d.categories.find((x) => x.id === cid);
        return { label: c?.name || "Uncategorized", value: val, color: c?.color || "#9ca3af" };
      })
      .sort((a, b) => b.value - a.value);

  const expSegs = segify(expByCat);
  const topExp = expSegs.slice(0, 8);

  // monthly bars for the range
  const now = new Date();
  const months: { label: string; income: number; expense: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: dt.toLocaleDateString("en-US", { month: "short" }),
      income: 0,
      expense: 0,
    });
  }
  for (const t of d.transactions) {
    const [y, m] = t.txn_date.split("-").map(Number);
    const idx = months.findIndex((_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
      return dt.getFullYear() === y && dt.getMonth() === m - 1;
    });
    if (idx === -1) continue;
    const base0 = d.toBaseAmount(Number(t.amount), t.currency);
    if (t.type === "income") months[idx].income += base0;
    else if (t.type === "expense") months[idx].expense += -base0;
  }

  const periods: { k: Period; label: string }[] = [
    { k: "3", label: "3 months" },
    { k: "6", label: "6 months" },
    { k: "12", label: "12 months" },
    { k: "ytd", label: "Year to date" },
  ];

  return (
    <div>
      <div className="toolbar">
        {periods.map((p) => (
          <button
            key={p.k}
            className={"btn btn-sm " + (period === p.k ? "btn-primary" : "")}
            onClick={() => setPeriod(p.k)}
          >
            {p.label}
          </button>
        ))}
        <div className="spacer" />
        <span className="muted" style={{ fontSize: 12.5 }}>All values in {d.base}</span>
      </div>

      <div className="grid stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="label">Income</div>
          <div className="value pos">{formatMoney(income, d.base)}</div>
        </div>
        <div className="card stat">
          <div className="label">Expenses</div>
          <div className="value">{formatMoney(expense, d.base)}</div>
        </div>
        <div className="card stat">
          <div className="label">Net Savings</div>
          <div className={"value " + (net < 0 ? "neg" : "pos")}>
            {formatMoney(net, d.base, { sign: true })}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Savings Rate</div>
          <div className={"value " + (savingsRate < 0 ? "neg" : "")}>
            {savingsRate.toFixed(0)}%
          </div>
          <div className="sub">of income kept</div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="section-head" style={{ margin: "0 0 12px" }}>
          <h2>Income vs Expenses</h2>
        </div>
        <MonthlyBars data={months} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        <div className="card card-pad">
          <div className="section-head" style={{ margin: "0 0 12px" }}>
            <h2>Spending by Category</h2>
          </div>
          {topExp.length > 0 ? (
            <Donut
              segments={topExp}
              centerLabel={formatMoney(expense, d.base).replace(/[.,]\d+$/, "")}
              centerSub="total"
            />
          ) : (
            <div className="empty" style={{ padding: 30 }}>No expenses in this period.</div>
          )}
        </div>

        <div className="card">
          <div className="section-head" style={{ margin: 0, padding: "16px 20px 10px" }}>
            <h2>Category Detail</h2>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <tbody>
                {expSegs.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <span className="pill">
                        <span className="dot" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    </td>
                    <td className="num muted">
                      {expense > 0 ? ((s.value / expense) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="num">
                      <strong>{formatMoney(s.value, d.base)}</strong>
                    </td>
                  </tr>
                ))}
                {expSegs.length === 0 && (
                  <tr>
                    <td className="muted" style={{ padding: 24 }}>No spending recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
