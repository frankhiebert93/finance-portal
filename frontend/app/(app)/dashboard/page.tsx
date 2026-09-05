"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { Spinner } from "@/components/ui";
import { Donut, MonthlyBars } from "@/components/charts";
import { formatMoney, formatDate, monthLabel } from "@/lib/format";
import { LIABILITY_TYPES } from "@/lib/types";

export default function Dashboard() {
  const d = useData();
  if (d.loading) return <Spinner />;
  if (d.error)
    return <div className="alert alert-err">{d.error}</div>;

  const { accounts, transactions, categories, goals, base } = d;

  // ---- Net worth / assets / liabilities ----
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.is_archived) continue;
    const bal = d.toBaseAmount(d.accountBalance(a.id), a.currency);
    if (bal >= 0) assets += bal;
    else liabilities += -bal;
  }
  const netWorth = assets - liabilities;

  // ---- Current month figures ----
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const inCurMonth = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return y === curY && m === curM + 1;
  };
  let income = 0;
  let expense = 0;
  const catSpend: Record<string, number> = {};
  for (const t of transactions) {
    if (!inCurMonth(t.txn_date)) continue;
    const base0 = d.toBaseAmount(Number(t.amount), t.currency);
    if (t.type === "income") income += base0;
    else if (t.type === "expense") {
      expense += -base0;
      const key = t.category_id || "uncat";
      catSpend[key] = (catSpend[key] || 0) + -base0;
    }
  }

  const catSegs = Object.entries(catSpend)
    .map(([cid, val]) => {
      const c = categories.find((x) => x.id === cid);
      return {
        label: c?.name || "Uncategorized",
        value: val,
        color: c?.color || "#9ca3af",
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ---- Last 6 months cashflow ----
  const months: { label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(curY, curM - i, 1);
    months.push({
      label: dt.toLocaleDateString("en-US", { month: "short" }),
      income: 0,
      expense: 0,
    });
  }
  for (const t of transactions) {
    const [y, m] = t.txn_date.split("-").map(Number);
    const idx = months.findIndex((_, i) => {
      const dt = new Date(curY, curM - (5 - i), 1);
      return dt.getFullYear() === y && dt.getMonth() === m - 1;
    });
    if (idx === -1) continue;
    const base0 = d.toBaseAmount(Number(t.amount), t.currency);
    if (t.type === "income") months[idx].income += base0;
    else if (t.type === "expense") months[idx].expense += -base0;
  }

  const recent = transactions.slice(0, 6);
  const goalsSaved = goals.reduce(
    (s, g) => s + d.toBaseAmount(Number(g.saved_amount), g.currency),
    0
  );
  const goalsTarget = goals.reduce(
    (s, g) => s + d.toBaseAmount(Number(g.target_amount), g.currency),
    0
  );

  const noData = accounts.length === 0 && transactions.length === 0;

  return (
    <div>
      {noData && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          Welcome! Start by adding an <Link href="/accounts" style={{ fontWeight: 700 }}>account</Link>,
          then log or import your <Link href="/transactions" style={{ fontWeight: 700 }}>transactions</Link>.
        </div>
      )}

      <div className="grid stat-grid">
        <div className="card stat">
          <div className="label">Net Worth</div>
          <div className={"value " + (netWorth < 0 ? "neg" : "")}>
            {formatMoney(netWorth, base)}
          </div>
          <div className="sub">
            {accounts.filter((a) => !a.is_archived).length} accounts · {base}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Assets</div>
          <div className="value pos">{formatMoney(assets, base)}</div>
          <div className="sub">What you own</div>
        </div>
        <div className="card stat">
          <div className="label">Liabilities</div>
          <div className="value">{formatMoney(liabilities, base)}</div>
          <div className="sub">What you owe</div>
        </div>
        <div className="card stat">
          <div className="label">This Month Net</div>
          <div className={"value " + (income - expense < 0 ? "neg" : "pos")}>
            {formatMoney(income - expense, base, { sign: true })}
          </div>
          <div className="sub">
            {formatMoney(income, base)} in · {formatMoney(expense, base)} out
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "1.3fr 1fr", marginTop: 16, alignItems: "start" }}
      >
        <div className="card card-pad">
          <div className="section-head" style={{ margin: "0 0 12px" }}>
            <h2>Cash Flow · Last 6 Months</h2>
          </div>
          <MonthlyBars data={months} />
        </div>

        <div className="card card-pad">
          <div className="section-head" style={{ margin: "0 0 12px" }}>
            <h2>Spending · {monthLabel(`${curY}-${String(curM + 1).padStart(2, "0")}-01`)}</h2>
          </div>
          {catSegs.length > 0 ? (
            <Donut
              segments={catSegs}
              centerLabel={formatMoney(expense, base).replace(/\.\d+$/, "")}
              centerSub="spent"
            />
          ) : (
            <div className="empty" style={{ padding: 30 }}>
              No spending logged this month.
            </div>
          )}
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "1.3fr 1fr", marginTop: 16, alignItems: "start" }}
      >
        <div className="card">
          <div className="section-head" style={{ margin: 0, padding: "16px 20px 12px" }}>
            <h2>Recent Transactions</h2>
            <Link href="/transactions" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {recent.length > 0 ? (
            <div className="table-wrap">
              <table className="tbl">
                <tbody>
                  {recent.map((t) => {
                    const acct = accounts.find((a) => a.id === t.account_id);
                    const cat = categories.find((c) => c.id === t.category_id);
                    return (
                      <tr key={t.id}>
                        <td style={{ width: 90 }} className="muted">
                          {formatDate(t.txn_date)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {t.payee || cat?.name || "—"}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {acct?.name}
                            {cat ? ` · ${cat.name}` : ""}
                          </div>
                        </td>
                        <td className={"num " + (Number(t.amount) < 0 ? "neg" : "pos")}>
                          {formatMoney(Number(t.amount), t.currency, { sign: true })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty" style={{ padding: 30 }}>
              No transactions yet.
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-head" style={{ margin: 0, padding: "16px 20px 12px" }}>
            <h2>Savings Goals</h2>
            <Link href="/goals" className="btn btn-ghost btn-sm">
              Manage
            </Link>
          </div>
          <div className="card-pad" style={{ paddingTop: 4 }}>
            {goals.length > 0 ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>
                    Total saved
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {formatMoney(goalsSaved, base)}{" "}
                    <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
                      of {formatMoney(goalsTarget, base)}
                    </span>
                  </div>
                </div>
                {goals.slice(0, 4).map((g) => {
                  const pct =
                    Number(g.target_amount) > 0
                      ? Math.min(100, (Number(g.saved_amount) / Number(g.target_amount)) * 100)
                      : 0;
                  return (
                    <div key={g.id} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 5,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{g.name}</span>
                        <span className="muted">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${pct}%`, background: g.color }} />
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                No goals yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
