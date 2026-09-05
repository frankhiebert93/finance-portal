"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Spinner } from "@/components/ui";
import { formatMoney, monthKey, monthLabel } from "@/lib/format";

export default function BudgetsPage() {
  const d = useData();
  const [month, setMonth] = useState(() => monthKey(new Date()).slice(0, 7));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (d.loading) return <Spinner />;

  const monthStart = `${month}-01`;
  const expenseCats = d.categories.filter((c) => c.kind === "expense" && !c.is_archived);

  // spent per category (base currency) for the selected month
  const spent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of d.transactions) {
      if (t.type !== "expense") continue;
      if (!t.txn_date.startsWith(month)) continue;
      const key = t.category_id || "uncat";
      map[key] = (map[key] || 0) + -d.toBaseAmount(Number(t.amount), t.currency);
    }
    return map;
  }, [d.transactions, month, d.base, d.usdMxn]);

  const budgetFor = (catId: string) =>
    d.budgets.find((b) => b.category_id === catId && b.month === monthStart);

  async function saveBudget(catId: string) {
    setSavingId(catId);
    try {
      const {
        data: { user },
      } = await d.supabase.auth.getUser();
      const raw = drafts[catId];
      const amount = parseFloat(raw ?? "");
      const existing = budgetFor(catId);
      if (isNaN(amount) || amount <= 0) {
        if (existing) {
          await d.supabase.from("budgets").delete().eq("id", existing.id);
        }
      } else if (existing) {
        await d.supabase.from("budgets").update({ amount }).eq("id", existing.id);
      } else {
        await d.supabase.from("budgets").insert({
          user_id: user!.id,
          category_id: catId,
          month: monthStart,
          amount,
        });
      }
      await d.reload();
      setDrafts((x) => {
        const c = { ...x };
        delete c[catId];
        return c;
      });
    } finally {
      setSavingId(null);
    }
  }

  const totalBudget = expenseCats.reduce(
    (s, c) => s + Number(budgetFor(c.id)?.amount || 0),
    0
  );
  const totalSpent = expenseCats.reduce((s, c) => s + (spent[c.id] || 0), 0);
  const uncatSpent = spent["uncat"] || 0;

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    setMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
    setDrafts({});
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-sm" onClick={() => shiftMonth(-1)}>
          ‹
        </button>
        <input
          className="input"
          type="month"
          style={{ maxWidth: 150 }}
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setDrafts({});
          }}
        />
        <button className="btn btn-sm" onClick={() => shiftMonth(1)}>
          ›
        </button>
        <div className="spacer" />
      </div>

      <div className="grid stat-grid" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="label">Budgeted</div>
          <div className="value">{formatMoney(totalBudget, d.base)}</div>
          <div className="sub">{monthLabel(monthStart)}</div>
        </div>
        <div className="card stat">
          <div className="label">Spent</div>
          <div className="value">{formatMoney(totalSpent, d.base)}</div>
          <div className="sub">
            {totalBudget > 0
              ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% of budget`
              : "No budget set"}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Remaining</div>
          <div className={"value " + (totalBudget - totalSpent < 0 ? "neg" : "pos")}>
            {formatMoney(totalBudget - totalSpent, d.base)}
          </div>
          <div className="sub">Budgeted minus spent</div>
        </div>
      </div>

      <div className="card">
        <div className="section-head" style={{ margin: 0, padding: "16px 20px 10px" }}>
          <h2>Category Budgets · {monthLabel(monthStart)}</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Amounts in {d.base}
          </span>
        </div>
        <div className="card-pad" style={{ paddingTop: 6 }}>
          {expenseCats.map((c) => {
            const b = budgetFor(c.id);
            const budgetAmt = Number(b?.amount || 0);
            const sp = spent[c.id] || 0;
            const pct = budgetAmt > 0 ? Math.min(100, (sp / budgetAmt) * 100) : 0;
            const over = budgetAmt > 0 && sp > budgetAmt;
            const draftVal = drafts[c.id];
            const inputVal = draftVal !== undefined ? draftVal : budgetAmt ? String(budgetAmt) : "";
            return (
              <div className="cat-row" key={c.id}>
                <span className="dot" style={{ background: c.color, width: 11, height: 11 }} />
                <div style={{ width: 150, fontWeight: 600 }}>{c.name}</div>
                <div className="cbar">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span className="muted">
                      {formatMoney(sp, d.base)}
                      {budgetAmt > 0 ? ` of ${formatMoney(budgetAmt, d.base)}` : ""}
                    </span>
                    {budgetAmt > 0 && (
                      <span className={over ? "neg" : "muted"}>
                        {over
                          ? `${formatMoney(sp - budgetAmt, d.base)} over`
                          : `${formatMoney(budgetAmt - sp, d.base)} left`}
                      </span>
                    )}
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${budgetAmt > 0 ? pct : 0}%`,
                        background: over ? "var(--red)" : c.color,
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", width: 170 }}>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ width: 100 }}
                    placeholder="0.00"
                    value={inputVal}
                    onChange={(e) =>
                      setDrafts((x) => ({ ...x, [c.id]: e.target.value }))
                    }
                    onBlur={() => {
                      if (drafts[c.id] !== undefined) saveBudget(c.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                  {savingId === c.id && <span className="muted" style={{ fontSize: 11 }}>…</span>}
                </div>
              </div>
            );
          })}
          {uncatSpent > 0 && (
            <div className="cat-row" style={{ opacity: 0.7 }}>
              <span className="dot" style={{ background: "#9ca3af", width: 11, height: 11 }} />
              <div style={{ width: 150, fontWeight: 600 }}>Uncategorized</div>
              <div className="cbar muted" style={{ fontSize: 12.5 }}>
                {formatMoney(uncatSpent, d.base)} spent — assign categories on the
                Transactions page to budget these.
              </div>
              <div style={{ width: 170 }} />
            </div>
          )}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
        Type a budget amount and press Enter (or click away) to save. Set 0 or blank
        to clear a category's budget for this month.
      </p>
    </div>
  );
}
